import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { fetchAccess } from "@/lib/subscriptions";
import { fetchFeatures, featureAvailable, type FeatureKey } from "@/lib/features";
import { reminderIds } from "@/lib/reminders";

export function useFeatures() {
  const { user } = useAuth();
  const flags = useQuery({ queryKey: ["features"], queryFn: fetchFeatures, staleTime: 15000, refetchInterval: 30000 });
  const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user });
  return { enabled: (key: FeatureKey) => featureAvailable(flags.data ?? [], key, !!access.data?.admin), rows: flags.data ?? [] };
}

export function Feature({ name, children }: { name: FeatureKey; children: ReactNode }) {
  const f = useFeatures();
  return f.enabled(name) ? children : null;
}

export function FeatureRouteGate({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation();
  const f = useFeatures();
  const disabled =
    (pathname === "/stats" && !f.enabled("progress")) ||
    (["/plans", "/checkout"].includes(pathname) && !f.enabled("checkout")) ||
    (pathname === "/" && hash === "qbanks" && !f.enabled("qbanks")) ||
    (pathname.startsWith("/library") && !f.enabled("library"));

  useEffect(() => {
    if (f.enabled("reminders")) return;
    const ln = (window as unknown as { Capacitor?: { Plugins?: { LocalNotifications?: { cancel: (o: unknown) => Promise<unknown> } } } }).Capacitor?.Plugins?.LocalNotifications;
    if (ln) void ln.cancel({ notifications: reminderIds() }).then(() => localStorage.removeItem("el-reminder")).catch(() => {});
  }, [f.enabled("reminders")]);

  return disabled ? (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl text-primary">Temporarily unavailable</h1>
      <p className="mt-3 text-muted-foreground">This feature is currently turned off.</p>
      <a className="mt-6 inline-block text-primary underline" href="/">Return home</a>
    </main>
  ) : children;
}
