import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Crown, Ticket } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { AppHeader } from "@/components/qbank/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from "@/lib/admin";
import { startCashfreeCheckout, confirmCashfreeCheckout } from "@/lib/cashfree.functions";
import { cashfreeCheckoutMode } from "@/lib/cashfree";
import { fetchPlans, fetchPayments, quotePlan, submitPayment, money, manualPaymentUpiId, DEFAULT_COUPON, checkoutCoupon } from "@/lib/subscriptions";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search) => z.object({ plan: z.string().catch("panacea"), months: z.coerce.number().refine(n => n === 12 || n === 24).catch(12) }).parse(search),
  head: () => ({ meta: [{ title: "Checkout | Elixir Pro" }, { name: "description", content: "Apply your Elixir offer and securely pay for your chosen Pro plan." }, { property: "og:title", content: "Elixir Pro checkout" }, { property: "og:description", content: "Your chosen plan, included NIRMAYACARE offer and secure payment." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CheckoutPage,
});
type CheckoutWindow = Window & { Cashfree?: (options: { mode: "sandbox" | "production" }) => { checkout: (options: { paymentSessionId: string; redirectTarget: "_modal" }) => Promise<{ error?: { message?: string }; paymentDetails?: unknown }> } };
async function loadCheckout() {
  if ((window as CheckoutWindow).Cashfree) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(); script.onerror = () => { script.remove(); reject(new Error("Couldn't load payment. Please try again.")); };
    document.body.appendChild(script);
  });
}
function CheckoutPage() {
  const { plan: planId, months } = Route.useSearch();
  const { user } = useAuth(); const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const plan = plans.data?.find(row => row.id === planId);
  const [coupon, setCoupon] = useState(DEFAULT_COUPON);
  const [step, setStep] = useState<"coupon" | "payment" | "received" | "complete">("coupon");
  const [quote, setQuote] = useState<{ total_paise: number; discount_percent: number } | null>(null);
  const [busy, setBusy] = useState(false); const [reference, setReference] = useState("");
  useEffect(() => { if (user && step !== "complete") void trackPurchase(step === "received" ? "verification_pending" : step === "coupon" ? "coupon_page" : "payment_page", planId, months).catch(() => {}); }, [user?.id, step, planId, months]);
  const startFn = useServerFn(startCashfreeCheckout); const confirmFn = useServerFn(confirmCashfreeCheckout);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function checkPending() {
      const { data: { session } } = await supabase.auth.getSession(); if (!session) return;
      const rows = await fetchPayments();
      for (const row of rows.filter(row => row.user_id === session.user.id && row.status === "pending" && row.cashfree_order_id && row.plan_id === planId)) {
        const result = await confirmFn({ data: { token: session.access_token, requestId: row.id } });
        if (result.status === "approved" && !cancelled) { setStep("complete"); await qc.invalidateQueries({ queryKey: ["access"] }); }
        else if (result.status === "received" && !cancelled) setStep("received");
      }
    }
    void checkPending().catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, planId]);
  async function next() {
    if (!user || !plan) return; setBusy(true);
    try { setQuote(await quotePlan(plan.id, months, checkoutCoupon(coupon))); setStep("payment"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Coupon unavailable"); }
    finally { setBusy(false); }
  }
  async function pay() {
    if (!plan || !quote) return; setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error("Please sign in again");
      const token = session.access_token;
      const order = await startFn({ data: { token, plan: plan.id, months: months as 12 | 24, coupon: checkoutCoupon(coupon) } });
      if (order.received) { setStep("received"); return; }
      await loadCheckout(); const Cashfree = (window as CheckoutWindow).Cashfree; if (!Cashfree) throw new Error("Payment couldn't open");
      void trackPurchase("payment_opened", plan.id, months).catch(() => {});
      const response = await Cashfree({ mode: cashfreeCheckoutMode(order.environment) }).checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: "_modal" });
      // A browser callback is never proof of payment. Always check the order server-side.
      const result = await confirmFn({ data: { token, requestId: order.requestId } });
      if (result.status === "approved") { setStep("complete"); toast.success("Your subscription is active"); }
      else if (result.status === "received") { setStep("received"); toast.success("Payment received — awaiting approval"); }
      else if (response.error) { void trackPurchase("payment_failed", plan.id, months).catch(() => {}); toast.error(response.error.message ?? "Payment failed. You can try again."); }
      else { void trackPurchase("payment_cancelled", plan.id, months).catch(() => {}); toast.info("Payment not completed yet. You can try again."); }
      await Promise.all([qc.invalidateQueries({ queryKey: ["access"] }), qc.invalidateQueries({ queryKey: ["admin", "payments"] })]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't start payment"); }
    finally { setBusy(false); }
  }
  async function manual() {
    if (!plan) return; setBusy(true);
    try { await submitPayment(plan.id, months, checkoutCoupon(coupon), reference); void trackPurchase("verification_pending", plan.id, months).catch(() => {}); toast.success("Payment reference sent for verification"); setReference(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't submit payment"); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen"><AppHeader /><main className="mx-auto max-w-lg px-6 py-8 sm:py-12">
    <Button variant="ghost" asChild className="mb-8 -ml-3"><Link to="/plans"><ArrowLeft />Plans</Link></Button>
    {plans.isPending ? <p>Loading plan…</p> : !plan ? <p role="alert" className="text-destructive">This plan is unavailable. Please choose another plan.</p> : <>
      <div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase text-accent"><Crown className="h-4 w-4" />{plan.name} · {months === 12 ? "1 year" : "2 years"}</div>
      {step === "complete" || step === "received" ? <><Check className="mb-4 h-12 w-12 text-success" /><h1 className="text-4xl text-primary">{step === "complete" ? "You're Pro" : "Payment received"}</h1><p className="mt-3 text-muted-foreground">{step === "complete" ? "Your subscription is active." : "Your payment is verified. Your subscription will unlock after administrator approval."}</p><Button asChild className="mt-8 w-full"><Link to="/" hash="qbanks">Back to Q-banks</Link></Button></> : <>
      <h1 className="text-4xl text-primary">{step === "coupon" ? "Your Elixir offer" : "Your next chapter"}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{step === "coupon" ? "The NIRMAYACARE offer is already included. Have another code?" : "Questions, answers and explanations for your chosen plan."}</p>
      {!user ? <Button asChild className="mt-8 w-full"><Link to="/auth">Continue with Google</Link></Button> : step === "coupon" ? <div className="mt-10">
        <Label htmlFor="checkout-coupon" className="flex items-center gap-2"><Ticket className="h-4 w-4 text-accent" />Coupon code</Label>
        <Input id="checkout-coupon" className="mt-3 h-12" value={coupon} onChange={event => setCoupon(event.target.value.toUpperCase())} maxLength={32} placeholder={DEFAULT_COUPON} />
        <p className="mt-3 flex items-center gap-2 text-xs text-success"><Check className="h-4 w-4" />{checkoutCoupon(coupon) === DEFAULT_COUPON ? "NIRMAYACARE applied to all accounts" : "Your code will be checked before payment"}</p>
        <Button className="mt-10 h-12 w-full" disabled={busy} onClick={() => void next()}>{busy ? "Checking…" : "Next"}<ArrowRight /></Button>
      </div> : <div className="mt-8">
        <dl className="space-y-4 border-y py-6 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Plan</dt><dd>{plan.name} · {months} months</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Offer</dt><dd className="text-success">{checkoutCoupon(coupon)}</dd></div><div className="flex items-center justify-between gap-3 pt-2"><dt className="font-semibold">Total to pay</dt><dd className="text-3xl font-semibold text-primary">{money(quote?.total_paise ?? (months === 12 ? plan.price_year : plan.price_two_year))}</dd></div></dl>
        <Button className="mt-6 h-12 w-full" disabled={busy || !quote} onClick={() => void pay()}>{busy ? "Please wait…" : "Pay"}</Button>
        <Button variant="ghost" className="mt-2 w-full" disabled={busy} onClick={() => setStep("coupon")}>Change coupon</Button>
        <details className="mt-8 text-sm"><summary className="cursor-pointer text-muted-foreground">Or pay manually via UPI</summary><p className="mt-3 text-muted-foreground">Pay {money(quote?.total_paise ?? 0)} and submit your transaction ID for verification.</p><Input className="mt-3" value={manualPaymentUpiId} readOnly aria-label="UPI ID" /><Button variant="outline" className="mt-2" onClick={() => void navigator.clipboard.writeText(manualPaymentUpiId).then(() => toast.success("UPI ID copied")).catch(() => toast.error("Couldn't copy UPI ID"))}>Copy UPI ID</Button><Label htmlFor="payment-reference" className="mt-5 block">UPI transaction ID</Label><Input id="payment-reference" className="mt-2" value={reference} onChange={event => setReference(event.target.value)} maxLength={150} /><Button className="mt-3" disabled={busy || reference.trim().length < 3} onClick={() => void manual()}>Submit for verification</Button></details>
      </div>}
      </>}
    </>}
  </main></div>;
}