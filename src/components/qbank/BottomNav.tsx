import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, BookOpen, House, NotebookPen } from "lucide-react";
import { useFeatures } from "./FeatureGate";
import { cn } from "@/lib/utils";
import type { FeatureKey } from "@/lib/features";

/** Fixed bottom tab bar: Home, Q-Banks, Progress, Library. */
export function BottomNav({ onHome }: { onHome?: (() => void) | undefined }) {
  const features = useFeatures();
  const { pathname, hash } = useLocation();
  const tabs = [
    { label: "Home", icon: House, to: "/", hash: "", active: pathname === "/" && hash !== "qbanks", feat: null },
    { label: "Q-Banks", icon: NotebookPen, to: "/", hash: "qbanks", active: pathname === "/" && hash === "qbanks", feat: "qbanks" as FeatureKey },
    { label: "Progress", icon: BarChart3, to: "/stats", hash: "", active: pathname.startsWith("/stats"), feat: "progress" as FeatureKey },
    { label: "Sanctuary", icon: BookOpen, to: "/library", hash: "", active: pathname.startsWith("/library"), feat: "library" as FeatureKey },
  ] as const;

  const visibleTabs = tabs.filter(t => !t.feat || features.enabled(t.feat));
  const gridColsClass = visibleTabs.length === 4 ? "grid-cols-4" : visibleTabs.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className={cn("mx-auto grid max-w-md", gridColsClass)}>
          {visibleTabs.map((t) => (
            <Link
              key={t.label}
              to={t.to}
              hash={t.hash}
              preload={t.to === "/stats" || t.to === "/library" ? "render" : "intent"}
              onClick={() => {
                if (t.label !== "Progress" && t.label !== "Sanctuary" && t.label !== "Library") onHome?.();
                window.scrollTo({ top: 0 });
              }}
              className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider", t.active ? "text-primary" : "text-muted-foreground")}
            >
              {t.active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />}
              <t.icon className="h-6 w-6" strokeWidth={t.active ? 2.2 : 1.6} />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
