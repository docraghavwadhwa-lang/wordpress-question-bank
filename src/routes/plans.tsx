import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Crown, Check, ArrowLeft, Ticket } from "lucide-react";
import { AppHeader } from "@/components/qbank/AppHeader";
import { TrialRequestButton } from "@/components/qbank/TrialRequest";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { trackPurchase } from "@/lib/admin";
import { subjectLabel } from "@/lib/subjects";
import { fetchPlans, fetchPlanSubjects, money, DEFAULT_COUPON, planPrice, planOriginalPrice, planMonths, type PlanMonths } from "@/lib/subscriptions";

export const Route = createFileRoute("/plans")({ head: () => ({ meta: [{ title: "Pro plans | Elixir" }, { name: "description", content: "Choose foundation, clinical or whole-bank medical MCQ access with Elixir Pro." }, { property: "og:title", content: "Elixir Pro plans" }, { property: "og:description", content: "Foundation, clinical and complete question-bank subscriptions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: PlansPage });
function PlansPage() {
  const { user } = useAuth();
  useEffect(() => { if (user) void trackPurchase("plans_viewed").catch(() => {}); }, [user?.id]);
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const coverage = useQuery({ queryKey: ["plan-subjects"], queryFn: fetchPlanSubjects });
  const [months, setMonths] = useState<PlanMonths>(12);
  return <div className="min-h-screen"><AppHeader /><main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
    <Button asChild variant="ghost" className="mb-5"><Link to="/"><ArrowLeft />Home</Link></Button>
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent"><Crown className="h-5 w-5" />ELIXIR PRO</p>
    <h1 className="text-4xl text-primary sm:text-5xl">Your next chapter</h1>
    <p className="mt-3 text-muted-foreground">Unlock the rest with your chosen plan.</p>
    <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-success"><Ticket className="h-4 w-4" />Coupon code <strong>{DEFAULT_COUPON}</strong> applied to all</p>
    <Tabs value={String(months)} onValueChange={value => setMonths(planMonths(Number(value)))} className="my-6"><TabsList><TabsTrigger value="12">1 year</TabsTrigger><TabsTrigger value="24">2 years</TabsTrigger><TabsTrigger value="36">3 years</TabsTrigger></TabsList></Tabs>
    {plans.error && <p role="alert" className="text-destructive">Couldn't load plans. Please reconnect.</p>}{plans.isPending && <p>Loading plans…</p>}
    <div className="grid gap-4 md:grid-cols-3">{plans.data?.filter(plan => plan.enabled && planPrice(plan, months) > 0).map(plan => <article key={plan.id} className="flex flex-col rounded-[8px] border bg-card p-6">
      <h2 className="text-2xl text-primary">{plan.name}</h2><p className="mt-2 min-h-12 text-sm text-muted-foreground">{plan.description}</p>
      <p className="mt-5 min-h-5 text-sm text-muted-foreground">{planOriginalPrice(plan, months) > planPrice(plan, months) && <s>{money(planOriginalPrice(plan, months))}</s>}</p>
      <p className="text-3xl font-semibold text-primary">{money(planPrice(plan, months))}</p><p className="text-xs text-muted-foreground">{months} months</p>
      <ul className="my-5 flex-1 space-y-2.5 text-sm">{[coverage.data?.filter(p => p.plan_id === plan.id).map(p => subjectLabel(p.subject)).join(", ") || "Included subjects", ...plan.perks].map(perk => <li key={perk} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{perk}</li>)}</ul>
      <Button asChild><Link to="/checkout" search={{ plan: plan.id, months }}>Choose plan</Link></Button>
    </article>)}</div>
    <section className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y py-6"><div><h2 className="text-2xl text-primary">Try the complete Q-bank</h2><p className="mt-1 text-sm text-muted-foreground">Request a 14-day trial · approval may take up to 24 hours</p></div><div className="w-full sm:w-52"><TrialRequestButton /></div></section>
  </main></div>;
}
