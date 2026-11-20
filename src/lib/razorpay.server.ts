const GATEWAY_URL = "https://connector-gateway.lovable.dev/razorpay";

export function razorpayEnv() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["RAZORPAY_CONNECTION_KEY"];
  const keyId = process.env["RAZORPAY_CONNECTION_KEY_ID"];
  if (!lovableKey || !connectionKey || !keyId) throw new Error("Razorpay is not connected");
  return { lovableKey, connectionKey, keyId };
}

export async function razorpay<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { lovableKey, connectionKey } = razorpayEnv();
  const res = await fetch(`${GATEWAY_URL}/${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Razorpay ${path} failed [${res.status}]: ${text}`);
    let msg = "Payment service error";
    try { msg = JSON.parse(text)?.error?.description ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/** Only place that activates a Razorpay-paid plan. Returns the request status after checking Razorpay. */
export async function confirmRazorpayRequest(requestId: string): Promise<"approved" | "pending" | "unknown"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: r, error } = await supabaseAdmin.from("payment_requests").select("id,status,total_paise,razorpay_order_id").eq("id", requestId).maybeSingle();
  if (error) throw error;
  if (!r || !r.razorpay_order_id) return "unknown";
  if (r.status === "approved") return "approved";
  if (r.status !== "pending") return "pending";
  const order = await razorpay<{ status: string; amount_paid: number }>(`orders/${r.razorpay_order_id}`);
  if (order.status === "paid" && order.amount_paid === r.total_paise) {
    const { error: e } = await supabaseAdmin.rpc("activate_razorpay_payment", { _request: r.id, _paid: order.amount_paid });
    if (e) throw e;
    return "approved";
  }
  return "pending";
}
