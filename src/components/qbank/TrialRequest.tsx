import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Hourglass, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { fetchTrialRequest, requestTrial } from "@/lib/trial-requests";
import { DEFAULT_TRIAL_DAYS, trialCountdown } from "@/lib/trials";
import { fetchAccess, subscriptionActive } from "@/lib/subscriptions";
import { supabase } from "@/integrations/supabase/client";

export function TrialRequestButton() {
  const { user } = useAuth(); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const request = useQuery({ queryKey: ["trial-request", user?.id], queryFn: () => user ? fetchTrialRequest(user.id) : Promise.resolve(null), enabled: !!user });
  const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user });
  async function submit() { setBusy(true); try { await requestTrial(); await qc.invalidateQueries({ queryKey: ["trial-request", user?.id] }); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send your request"); } finally { setBusy(false); } }
  if (access.data?.admin || access.data?.subscriptions.some(s => subscriptionActive(s))) return null;
  return <><Button variant="outline" className="w-full" onClick={() => setOpen(true)}>Request a trial</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle className="text-2xl text-primary">{request.data ? request.data.status === "rejected" ? "Contact our team" : "Your request has been sent" : `Try Elixir for ${DEFAULT_TRIAL_DAYS} days`}</DialogTitle><DialogDescription>{request.data ? request.data.status === "rejected" ? "Please speak with our team about your trial request." : "Trial approval may take up to 24 hours. We’ll unlock your access after approval." : "Request a 14-day trial of the complete Q-bank. Our team approves each request; offline downloads are not included during the trial."}</DialogDescription></DialogHeader>{!request.data && (user ? <Button disabled={busy || request.isPending || !!request.error} onClick={() => void submit()}>{busy ? "Sending…" : "Request 14-day trial"}</Button> : <Button asChild><Link to="/auth">Sign in to request a trial</Link></Button>)}{request.error && <p role="alert" className="text-sm text-destructive">Couldn't check your request. Reconnect and try again.</p>}<Button asChild variant="secondary"><a href="tel:+916360759145"><Phone />Get in touch with team</a></Button></DialogContent></Dialog></>;
}

export function TrialCountdown() {
  const { user } = useAuth(); const [now, setNow] = useState(Date.now()); const [buyOpen, setBuyOpen] = useState(false);
  const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user, refetchInterval: 60000 });
  const trial = access.data?.subscriptions.find(s => s.is_trial && subscriptionActive(s, now));
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!trial || !user) return; const visit = () => { if (navigator.onLine && document.visibilityState === "visible") void supabase.rpc("record_trial_visit").then(() => {}); }; visit(); document.addEventListener("visibilitychange", visit); return () => document.removeEventListener("visibilitychange", visit); }, [trial?.id, user?.id]);
  if (!trial) return null; const left = trialCountdown(trial.ends_at, now);
  return <><section aria-label="Trial countdown" className="mb-5 flex flex-wrap items-center justify-between gap-3 border-y bg-secondary/60 px-4 py-3">
    <span className="flex items-center gap-2 text-sm font-semibold text-primary"><Hourglass className="h-4 w-4" />Your full-access trial</span>
    <div className="flex w-full flex-col items-center gap-3 sm:w-auto"><div className="grid w-full grid-cols-4 gap-2 tabular-nums sm:gap-4">{Object.entries(left).map(([label, value]) => <div className="min-w-10 text-center" key={label}><span className="block text-xl font-semibold text-primary">{String(value).padStart(2,"0")}</span><span className="text-[10px] uppercase text-muted-foreground">{label}</span></div>)}</div><Button size="sm" className="w-full" onClick={() => setBuyOpen(true)}>Buy now</Button></div>
  </section><Dialog open={buyOpen} onOpenChange={setBuyOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle className="font-display text-2xl text-primary">Continue with Elixir Pro</DialogTitle><DialogDescription>Choose your plan or speak with our team.</DialogDescription></DialogHeader><Button asChild><Link to="/plans" onClick={() => setBuyOpen(false)}><Crown />See Pro plans</Link></Button><Button asChild variant="outline"><a href="tel:+916360759145"><Phone />Call the team</a></Button></DialogContent></Dialog></>;
}
