import { useEffect, useRef, useState, type ReactNode } from "react";
import { Smartphone, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { deviceApprovalKey, registerDevice, type DeviceResult } from "@/lib/device-access";
import { Button } from "@/components/ui/button";
import { OpeningScreen } from "./OpeningScreen";
import { refreshOfflineLicense } from "@/lib/offline-data";

export function DeviceGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const [allowed, setAllowed] = useState<string | null>(null);
  const [result, setResult] = useState<DeviceResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const checking = useRef(false);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  async function check(replace?: string) {
    if (!user || checking.current) return;
    checking.current = true;
    const userId = user.id;
    setBusy(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) return;
      const approval = deviceApprovalKey(userId, session.access_token);
      const next = await registerDevice(replace);
      if (identity.current !== userId) return;
      setResult(next);
      if (next.status === "active") {
        setAllowed(userId);
        if (approval) sessionStorage.setItem(approval, "yes");
        localStorage.setItem(`elixir-device-approved:${userId}`, "yes");
        void refreshOfflineLicense().catch(() => {});
      }
      else { setAllowed(null); if (approval) sessionStorage.removeItem(approval); localStorage.removeItem(`elixir-device-approved:${userId}`); await qc.cancelQueries(); qc.clear(); }
      if (next.status === "revoked") await supabase.auth.signOut({ scope: "local" });
    } catch (e) { if (identity.current === userId) setError(e instanceof Error ? e.message : "Couldn't check your devices. Please try again."); }
    finally { checking.current = false; setBusy(false); }
  }
  useEffect(() => {
    setResult(null); setError("");
    if (!user) { setAllowed(null); return; }
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session || session.user.id !== user.id) return;
      const approval = deviceApprovalKey(user.id, session.access_token);
      if ((approval && sessionStorage.getItem(approval) === "yes") || (!navigator.onLine && localStorage.getItem(`elixir-device-approved:${user.id}`) === "yes")) setAllowed(user.id);
      if (navigator.onLine) void check();
    });
    const onOnline = () => void check();
    const onVisible = () => { if (document.visibilityState === "visible" && navigator.onLine) void check(); };
    const interval = setInterval(() => { if (navigator.onLine) void check(); }, 60000);
    window.addEventListener("online", onOnline); document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener("online", onOnline); document.removeEventListener("visibilitychange", onVisible); };
  }, [user?.id]);
  if (!ready) return <OpeningScreen />;
  if (!user || allowed === user.id) return children;
  if (!result && !error) return <OpeningScreen />;
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
    <Smartphone className="mb-5 h-10 w-10 text-accent" />
    <h1 className="text-3xl text-primary">{result?.status === "choose" ? "Your devices" : "Connection interrupted"}</h1>
    <p className="mt-3 text-sm text-muted-foreground">{result?.status === "choose" ? "Your account can be used on two devices. Choose one to sign out and continue here." : "We couldn't confirm your session. Please try again."}</p>
    <div className="mt-6 space-y-3">{result?.devices?.map(device => <Button key={device.session_id} variant="outline" className="h-auto w-full justify-between whitespace-normal p-4 text-left" disabled={busy} onClick={() => void check(device.session_id)}><span>{device.device_name}<span className="mt-1 block text-xs font-normal text-muted-foreground">Last used {new Date(device.updated_at).toLocaleString()}</span></span><LogOut className="ml-3 shrink-0" /></Button>)}</div>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {!result?.devices?.length && <Button className="mt-5" disabled={busy} onClick={() => void check()}>{busy ? "Checking…" : "Try again"}</Button>}
    <Button variant="ghost" className="mt-4" onClick={() => void supabase.auth.signOut({ scope: "local" })}>Cancel and sign out</Button>
  </main>;
}