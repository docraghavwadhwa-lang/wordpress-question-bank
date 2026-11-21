import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cashfreeOrderSchema, CASHFREE_ENVIRONMENT } from "./cashfree";

async function authenticatedPaymentUser(token: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Sign-in is unavailable. Please try again.");
  const asUser = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}`, apikey: key } } });
  const { data, error } = await asUser.auth.getUser(token);
  if (error || !data.user) throw new Error("Please sign in again");
  const { data: active, error: deviceError } = await asUser.rpc("device_session_active");
  if (deviceError || !active) throw new Error("This device is signed out. Please sign in again.");
  return { user: data.user, asUser };
}
export const startCashfreeCheckout = createServerFn({ method: "POST" })
  .inputValidator(d => z.object({ token: z.string().min(10), plan: z.string().min(1).max(40), months: z.union([z.literal(12), z.literal(24)]), coupon: z.string().max(32) }).parse(d))
  .handler(async ({ data }) => {
    const { user, asUser } = await authenticatedPaymentUser(data.token);
    const { cashfreeRequest, cashfreeCredentials, CashfreeError } = await import("./cashfree.server");
    cashfreeCredentials();
    const [{ data: quotes, error: quoteError }, { data: profile, error: profileError }] = await Promise.all([
      asUser.rpc("quote_plan", { _plan: data.plan, _months: data.months, _coupon: data.coupon }),
      asUser.from("profiles").select("phone,full_name").eq("id", user.id).single(),
    ]);
    const quote = quotes?.[0];
    if (quoteError || !quote) throw new Error(quoteError?.message ?? "Quote unavailable");
    if (profileError) throw profileError;
    const phone = profile.phone?.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) throw new Error("Please add a valid mobile number to your profile before paying.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("reserve_cashfree_payment", {
      _user: user.id, _plan: data.plan, _months: data.months, _coupon: data.coupon,
      _total: quote.total_paise, _discount: quote.discount_percent, _environment: CASHFREE_ENVIRONMENT,
    });
    const row = rows?.[0];
    if (error || !row?.cashfree_order_id) throw new Error(error?.message ?? "Couldn't prepare payment");
    if (row.verified_paid_at) return { requestId: row.id, paymentSessionId: "", environment: CASHFREE_ENVIRONMENT, received: true };
    let payload: unknown;
    try { payload = await cashfreeRequest(`orders/${encodeURIComponent(row.cashfree_order_id)}`); }
    catch (error) {
      if (!(error instanceof CashfreeError) || error.status !== 404) throw error;
      payload = await cashfreeRequest("orders", { idempotencyKey: row.id, body: {
        order_id: row.cashfree_order_id, order_amount: row.total_paise / 100, order_currency: "INR",
        customer_details: { customer_id: user.id, customer_phone: phone, ...(user.email ? { customer_email: user.email } : {}), ...(profile.full_name ? { customer_name: profile.full_name } : {}) },
        order_meta: { return_url: `https://elixir.nirmayacare.com/checkout?plan=${encodeURIComponent(data.plan)}&months=${data.months}`, notify_url: "https://elixir.nirmayacare.com/api/public/cashfree-webhook" },
        order_note: `Elixir ${data.plan} · ${data.months} months`,
      } });
    }
    const order = cashfreeOrderSchema.parse(payload);
    if (order.order_status === "PAID") {
      const { confirmCashfreeRequest } = await import("./cashfree.server");
      const status = await confirmCashfreeRequest(row.id);
      if (status !== "received" && status !== "approved") throw new Error("Payment details do not match. Please contact us.");
      return { requestId: row.id, paymentSessionId: "", environment: CASHFREE_ENVIRONMENT, received: true };
    }
    if (order.order_status !== "ACTIVE" || !order.payment_session_id) throw new Error("This payment has expired or closed. Please contact us to restart it.");
    return { requestId: row.id, paymentSessionId: order.payment_session_id, environment: CASHFREE_ENVIRONMENT, received: false };
  });
export const confirmCashfreeCheckout = createServerFn({ method: "POST" })
  .inputValidator(d => z.object({ token: z.string().min(10), requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { user, asUser } = await authenticatedPaymentUser(data.token);
    const { data: row, error } = await asUser.from("payment_requests").select("user_id").eq("id", data.requestId).maybeSingle();
    if (error || !row || row.user_id !== user.id) throw new Error("Payment not found");
    const { confirmCashfreeRequest } = await import("./cashfree.server");
    return { status: await confirmCashfreeRequest(data.requestId) };
  });