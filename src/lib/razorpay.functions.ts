import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function userFromToken(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Please sign in again");
  return { user: data.user, supabaseAdmin };
}

export const startRazorpayCheckout = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10), plan: z.string().min(1).max(40), months: z.union([z.literal(12), z.literal(24)]), coupon: z.string().max(32) }).parse(d))
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await userFromToken(data.token);
    const { razorpay, razorpayEnv } = await import("./razorpay.server");
    const { createClient } = await import("@supabase/supabase-js");
    // Quote as the signed-in user so the database computes the price.
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const asUser = createClient(process.env["SUPABASE_URL"]!, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${data.token}`, apikey: key } } });
    const { data: q, error: qe } = await asUser.rpc("quote_plan", { _plan: data.plan, _months: data.months, _coupon: data.coupon });
    if (qe || !q?.[0]) throw new Error(qe?.message ?? "Quote unavailable");
    const { total_paise, discount_percent } = q[0];
    if (total_paise < 100) throw new Error("Amount too small for online payment");
    const coupon = data.coupon.trim().toUpperCase() || null;
    // Reuse an unpaid Razorpay request for the same choice.
    const { data: existing } = await supabaseAdmin.from("payment_requests").select("id,razorpay_order_id,total_paise,months").eq("user_id", user.id).eq("plan_id", data.plan).eq("status", "pending").maybeSingle();
    let requestId: string; let orderId: string;
    if (existing && existing.razorpay_order_id && existing.total_paise === total_paise && existing.months === data.months) {
      requestId = existing.id; orderId = existing.razorpay_order_id;
    } else {
      if (existing && !existing.razorpay_order_id) throw new Error("A manual UPI payment for this plan is already awaiting verification");
      if (existing) await supabaseAdmin.from("payment_requests").update({ status: "rejected" }).eq("id", existing.id).eq("status", "pending");
      const { data: row, error } = await supabaseAdmin.from("payment_requests").insert({ user_id: user.id, plan_id: data.plan, months: data.months, total_paise, coupon_code: coupon, discount_percent, payment_reference: "Razorpay" }).select("id").single();
      if (error) throw error;
      const order = await razorpay<{ id: string }>("orders", { method: "POST", body: { amount: total_paise, currency: "INR", receipt: row.id.slice(0, 40), notes: { requestId: row.id, userId: user.id } } });
      await supabaseAdmin.from("payment_requests").update({ razorpay_order_id: order.id, payment_reference: `Razorpay ${order.id}` }).eq("id", row.id);
      requestId = row.id; orderId = order.id;
    }
    return { requestId, orderId, amount: total_paise, keyId: razorpayEnv().keyId, email: user.email ?? "" };
  });

export const confirmRazorpayCheckout = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10), requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await userFromToken(data.token);
    const { data: r } = await supabaseAdmin.from("payment_requests").select("user_id").eq("id", data.requestId).maybeSingle();
    if (!r || r.user_id !== user.id) throw new Error("Payment not found");
    const { confirmRazorpayRequest } = await import("./razorpay.server");
    return { status: await confirmRazorpayRequest(data.requestId) };
  });
