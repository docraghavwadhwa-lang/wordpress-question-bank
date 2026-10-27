import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, House, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

/** Fixed bottom tab bar: Home, Q-Banks (subject list on home), Progress. */
export function BottomNav({ onHome }: { onHome?: (() => void) | undefined }) {
  const { pathname, hash } = useLocation();
  const tabs = [
    { label: "Home", icon: House, to: "/", hash: "", active: pathname === "/" && hash !== "qbanks" },
    { label: "Q-Banks", icon: NotebookPen, to: "/", hash: "qbanks", active: pathname === "/" && hash === "qbanks" },
    { label: "Progress", icon: BarChart3, to: "/stats", hash: "", active: pathname.startsWith("/stats") },
  ] as const;
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {tabs.map((t) => (
            <Link
              key={t.label}
              to={t.to}
              hash={t.hash}
              onClick={() => {
                if (t.label !== "Progress") onHome?.();
                window.scrollTo({ top: 0 });
              }}
              className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider", t.active ? "text-primary" : "text-muted-foreground")}
            >
              {t.active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent" />}
              <t.icon className="h-6 w-6" strokeWidth={t.active ? 2.2 : 1.6} />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
