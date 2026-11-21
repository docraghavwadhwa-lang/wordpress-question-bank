import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/cashfree-webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const body = await request.text();
    if (body.length > 100000) return new Response("Payload too large", { status: 413 });
    const { cashfreeCredentials, verifyCashfreeSignature, confirmCashfreeRequest } = await import("@/lib/cashfree.server");
    try {
      const { secret } = cashfreeCredentials();
      if (!await verifyCashfreeSignature(body, request.headers.get("x-webhook-timestamp"), request.headers.get("x-webhook-signature"), secret)) return new Response("Invalid signature", { status: 401 });
      const event = z.object({ type: z.string().max(100), data: z.object({ order: z.object({ order_id: z.string().regex(/^elixir_[a-f0-9]{32}$/) }) }) }).safeParse(JSON.parse(body));
      if (!event.success) return new Response("Invalid event", { status: 400 });
      if (event.data.type !== "PAYMENT_SUCCESS_WEBHOOK") return new Response("ok");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin.from("payment_requests").select("id").eq("cashfree_order_id", event.data.data.order.order_id).maybeSingle();
      if (error) throw error;
      if (row) await confirmCashfreeRequest(row.id);
      return new Response("ok");
    } catch (error) {
      if (error instanceof SyntaxError) return new Response("Invalid event", { status: 400 });
      console.error("Cashfree webhook could not verify payment", error);
      return new Response("Please retry", { status: 500 });
    }
  } } },
});