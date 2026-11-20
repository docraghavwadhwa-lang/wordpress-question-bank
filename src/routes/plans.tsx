import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Crown, Check, ArrowLeft, Ticket } from "lucide-react";
import { AppHeader } from "@/components/qbank/AppHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPlans, money, DEFAULT_COUPON } from "@/lib/subscriptions";

export const Route = createFileRoute("/plans")({ head: () => ({ meta: [{ title: "Pro plans | Elixir" }, { name: "description", content: "Choose foundation, clinical or whole-bank medical MCQ access with Elixir Pro." }, { property: "og:title", content: "Elixir Pro plans" }, { property: "og:description", content: "Foundation, clinical and complete question-bank subscriptions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: PlansPage });
function PlansPage() {
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const [months, setMonths] = useState<12 | 24>(12);
  return <div className="min-h-screen"><AppHeader /><main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
    <Button asChild variant="ghost" className="mb-5"><Link to="/"><ArrowLeft />Home</Link></Button>
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent"><Crown className="h-5 w-5" />ELIXIR PRO</p>
    <h1 className="text-4xl text-primary sm:text-5xl">Your next chapter</h1>
    <p className="mt-3 text-muted-foreground">Unlock the rest with your chosen plan.</p>
    <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-success"><Ticket className="h-4 w-4" />Coupon code <strong>{DEFAULT_COUPON}</strong> applied to all</p>
    <Tabs value={String(months)} onValueChange={value => setMonths(value === "24" ? 24 : 12)} className="my-6"><TabsList><TabsTrigger value="12">1 year</TabsTrigger><TabsTrigger value="24">2 years</TabsTrigger></TabsList></Tabs>
    {plans.error && <p role="alert" className="text-destructive">Couldn't load plans. Please reconnect.</p>}{plans.isPending && <p>Loading plans…</p>}
    <div className="grid gap-4 md:grid-cols-3">{plans.data?.map(plan => <article key={plan.id} className="flex flex-col rounded-[8px] border bg-card p-6">
      <h2 className="text-2xl text-primary">{plan.name}</h2><p className="mt-2 min-h-12 text-sm text-muted-foreground">{plan.description}</p>
      <p className="mt-5 text-sm text-muted-foreground"><s>{money((months === 12 ? plan.original_price_year : plan.original_price_two_year) ?? (months === 12 ? plan.price_year : plan.price_two_year))}</s></p>
      <p className="text-3xl font-semibold text-primary">{money(months === 12 ? plan.price_year : plan.price_two_year)}</p><p className="text-xs text-muted-foreground">{months} months</p>
      <p className="my-5 flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" />Questions, answers & explanations</p>
      <Button asChild variant={plan.id === "panacea" ? "default" : "outline"}><Link to="/checkout" search={{ plan: plan.id, months }}>Choose plan</Link></Button>
    </article>)}</div>
  </main></div>;
}
