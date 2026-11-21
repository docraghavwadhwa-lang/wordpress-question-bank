import { cashfreeOrderSchema, cashfreePaymentMatches, CASHFREE_ENVIRONMENT } from "./cashfree";

export class CashfreeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function cashfreeCredentials() {
  const appId = process.env["CASHFREE_APP_ID"];
  const secret = process.env["CASHFREE_SECRET_KEY"];
  if (!appId || !secret) throw new Error("Cashfree is not connected yet. Please contact us.");
  return { appId, secret };
}
export async function cashfreeRequest(path: string, init: { body?: unknown; idempotencyKey?: string } = {}) {
  const { appId, secret } = cashfreeCredentials();
  const response = await fetch(`https://api.cashfree.com/pg/${path}`, {
    method: init.body ? "POST" : "GET",
    headers: { "x-client-id": appId, "x-client-secret": secret, "x-api-version": "2025-01-01",
      "Content-Type": "application/json", ...(init.idempotencyKey ? { "x-idempotency-key": init.idempotencyKey } : {}) },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const body = await response.text();
    // Redact credential echoes before logging or returning provider errors.
    const safe = body.replaceAll(appId, "[redacted]").replaceAll(secret, "[redacted]");
    console.error(`Cashfree request failed [${response.status}]: ${safe}`);
    let message = "Payment service unavailable";
    try { const error = JSON.parse(safe) as { message?: string }; message = error.message || message; } catch {}
    throw new CashfreeError(response.status, `Cashfree [${response.status}]: ${message}`);
  }
  return response.json() as Promise<unknown>;
}
export async function confirmCashfreeRequest(requestId: string): Promise<"approved" | "received" | "pending" | "unknown"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin.from("payment_requests").select("id,user_id,status,total_paise,cashfree_order_id,cashfree_environment,verified_paid_at").eq("id", requestId).maybeSingle();
  if (error) throw error;
  if (!row?.cashfree_order_id || row.cashfree_environment !== CASHFREE_ENVIRONMENT) return "unknown";
  if (row.status === "approved") return "approved";
  if (row.status !== "pending") return "unknown";
  if (row.verified_paid_at) return "received";
  let payload: unknown;
  try { payload = await cashfreeRequest(`orders/${encodeURIComponent(row.cashfree_order_id)}`); }
  catch (error) { if (error instanceof CashfreeError && error.status === 404) return "pending"; throw error; }
  const order = cashfreeOrderSchema.parse(payload);
  if (!cashfreePaymentMatches(order, { orderId: row.cashfree_order_id, userId: row.user_id, paise: row.total_paise })) return "pending";
  const { data: recorded, error: recordError } = await supabaseAdmin.rpc("record_cashfree_payment", {
    _request: row.id, _order: order.order_id, _paid: row.total_paise, _environment: CASHFREE_ENVIRONMENT,
  });
  if (recordError) throw recordError;
  return recorded ? "received" : "unknown";
}
export async function verifyCashfreeSignature(body: string, timestamp: string | null, signature: string | null, secret: string) {
  if (!timestamp || !/^\d{10,16}$/.test(timestamp) || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const bytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(timestamp + body));
  } catch { return false; }
}