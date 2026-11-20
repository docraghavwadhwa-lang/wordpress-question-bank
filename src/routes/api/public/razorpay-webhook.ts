import { createFileRoute } from "@tanstack/react-router";

// Never trusts the event body: it only looks up the order and re-checks it with Razorpay.
export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: { handlers: { POST: async ({ request }) => {
    let orderId: string | undefined;
    try { const b = await request.json(); orderId = b?.payload?.payment?.entity?.order_id ?? b?.payload?.order?.entity?.id; } catch { return new Response("ok"); }
    if (typeof orderId !== "string" || !/^order_[A-Za-z0-9]{6,40}$/.test(orderId)) return new Response("ok");
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.from("payment_requests").select("id").eq("razorpay_order_id", orderId).maybeSingle();
      if (!data) return new Response("ok");
      const { confirmRazorpayRequest } = await import("@/lib/razorpay.server");
      await confirmRazorpayRequest(data.id);
      return new Response("ok");
    } catch (e) { console.error("razorpay webhook", e); return new Response("retry", { status: 500 }); }
  } } },
});
