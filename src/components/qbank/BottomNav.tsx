import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, House, NotebookPen, Users } from "lucide-react";
import { useFeatures } from "./FeatureGate";
import { cn } from "@/lib/utils";
import type { FeatureKey } from "@/lib/features";

/** Persistent 4-tab bottom navigation bar across the app: Home | Q-Banks | Homies | Progress */
export function BottomNav({ onHome }: { onHome?: (() => void) | undefined }) {
  const features = useFeatures();
  const { pathname, hash } = useLocation();
  const tabs = [
    { label: "Home", icon: House, to: "/", hash: "", active: pathname === "/" && hash !== "qbanks", feat: null },
    { label: "Q-Banks", icon: NotebookPen, to: "/", hash: "qbanks", active: pathname === "/" && hash === "qbanks", feat: "qbanks" as FeatureKey },
    { label: "Homies", icon: Users, to: "/homies", hash: "", active: pathname.startsWith("/homies") || pathname.startsWith("/library"), feat: null },
    { label: "Progress", icon: BarChart3, to: "/stats", hash: "", active: pathname.startsWith("/stats"), feat: "progress" as FeatureKey },
  ] as const;

  const visibleTabs = tabs.filter(t => !t.feat || features.enabled(t.feat));
  const gridColsClass = visibleTabs.length === 4 ? "grid-cols-4" : visibleTabs.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className={cn("mx-auto grid max-w-md", gridColsClass)}>
        {visibleTabs.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            hash={t.hash}
            preload={t.to === "/stats" || t.to === "/homies" ? "render" : "intent"}
            onClick={() => {
              if (t.label !== "Progress" && t.label !== "Homies") onHome?.();
              window.scrollTo({ top: 0 });
            }}
            className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors", t.active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            {t.active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />}
            <t.icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={t.active ? 2.2 : 1.6} />
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
