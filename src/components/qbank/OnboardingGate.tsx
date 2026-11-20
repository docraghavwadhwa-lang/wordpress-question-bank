import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { completionKey, needsOnboarding } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { OpeningScreen } from "./OpeningScreen";
import { OnboardingWizard } from "./OnboardingWizard";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const [completedUser, setCompletedUser] = useState<string | null>(null);
  const status = useQuery({
    queryKey: ["onboarding", user?.id],
    enabled: !!user,
    retry: 1,
    staleTime: Infinity,
    queryFn: async () => {
      if (!user) return true;
      try { if (localStorage.getItem(completionKey(user.id)) === "true") return true; } catch { /* Storage may be disabled. */ }
      const { data, error } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).single();
      if (error) throw error;
      const complete = !needsOnboarding(data.onboarding_completed_at);
      if (complete) { try { localStorage.setItem(completionKey(user.id), "true"); } catch { /* Optional cache. */ } }
      return complete;
    },
  });
  useEffect(() => {
    if (ready && user && !status.isPending) (window as unknown as { ElixirLaunch?: { ready: () => void } }).ElixirLaunch?.ready();
  }, [ready, user, status.isPending]);
  if (!ready || (user && status.isPending)) return <OpeningScreen />;
  if (!user) return children;
  if (completedUser === user.id || status.data === true) return children;
  if (status.isError) return <main className="grid min-h-dvh place-items-center px-5"><div className="max-w-sm text-center"><h1 className="text-3xl text-primary">Let's get you started</h1><p role="alert" className="mt-3 text-sm text-muted-foreground">Connect to the internet to check your study profile.</p><Button className="mt-6" onClick={() => void status.refetch()}>Try again</Button></div></main>;
  return <OnboardingWizard key={user.id} onComplete={() => {
    try { localStorage.setItem(completionKey(user.id), "true"); } catch { /* Optional cache. */ }
    qc.setQueryData(["onboarding", user.id], true);
    void qc.invalidateQueries({ queryKey: ["profile", user.id] });
    setCompletedUser(user.id);
  }} />;
}