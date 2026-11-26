import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { dateLabel, fetchAccess, fetchPlanSubjects, planName, subscriptionActive } from "@/lib/subscriptions";
import { subjectLabel } from "@/lib/subjects";

export function ProControl({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user });
  const coverage = useQuery({ queryKey: ["plan-subjects"], queryFn: fetchPlanSubjects });
  const active = access.data?.subscriptions.filter(s => !s.is_trial && subscriptionActive(s)) ?? [];
  const pro = !!access.data?.admin || active.length > 0;
  const icon = <Crown className={`h-4 w-4 ${pro ? "fill-gold/20 text-gold" : "text-muted-foreground"}`} />;

  return (
    <>
      {pro ? (
        <Button
          variant={compact ? "outline" : "secondary"}
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Your Pro plan"
          className="h-9 w-9"
        >
          {icon}
        </Button>
      ) : (
        <Button asChild variant={compact ? "outline" : "secondary"} size="icon" className="h-9 w-9">
          <Link to="/plans" aria-label="Pro subscription plans">
            {icon}
          </Link>
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-primary">
              <Crown className="text-gold" />Your Pro access
            </DialogTitle>
            <DialogDescription>
              {access.data?.admin
                ? "Administrator · full Panacea access to every subject"
                : "Your active plans and included subjects"}
            </DialogDescription>
          </DialogHeader>
          {active.map(s => (
            <section key={s.id} className="border-t pt-4">
              <h3 className="text-xl text-primary">{planName(s.plan_id)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{dateLabel(s.starts_at)} → {dateLabel(s.ends_at)}</p>
              <p className="mt-2 text-sm">{coverage.data?.filter(p => p.plan_id === s.plan_id).map(p => subjectLabel(p.subject)).join(", ")}</p>
              <p className="mt-2 text-xs text-muted-foreground">Two devices · included questions available for offline download</p>
            </section>
          ))}
          <Button asChild variant="outline">
            <Link to="/plans" onClick={() => setOpen(false)}>View subscription plans</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
