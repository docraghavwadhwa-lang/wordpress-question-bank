import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { dateLabel, fetchAccess, subscriptionActive , planName } from "@/lib/subscriptions";
import { Button } from "@/components/ui/button";

export function SubscriptionStatus() {
  const { user } = useAuth();
  const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user, refetchInterval: 30000 });
  return <section className="mt-6 border-y py-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-2xl text-primary"><Crown className="h-5 w-5 text-gold" />Your subscriptions</h2><Button variant="outline" asChild><Link to="/plans">Explore Pro plans</Link></Button></div>
    {access.isPending ? <p className="mt-3 text-sm text-muted-foreground">Loading subscriptions…</p> : access.error ? <p role="alert" className="mt-3 text-sm text-destructive">Connect to check subscription dates.</p> : !access.data?.subscriptions.length ? <p className="mt-3 text-sm text-muted-foreground">Free access · 10% of each subject</p> : access.data.subscriptions.map(s => <div key={s.id} className="mt-4"><p className="font-semibold text-primary">{planName(s.plan_id)} · {subscriptionActive(s) ? "Active" : s.revoked ? "Revoked" : Date.parse(s.starts_at)>Date.now() ? "Starts soon" : "Expired"}</p><p className="text-sm text-muted-foreground">Valid from {dateLabel(s.starts_at)} to {dateLabel(s.ends_at)}</p></div>)}
  </section>;
}