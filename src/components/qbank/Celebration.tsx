import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Flame } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { milestoneMessage } from "@/lib/streak";

export function Celebration({ days, stats, onClose }: { days: number | null; stats: { label: string; value: string }[]; onClose: () => void }) {
  useEffect(() => {
    if (!days) return;
    const colors = ["#1f4a3a", "#c8693f", "#e8c66a", "#6fa58b"];
    const end = Date.now() + 1800;
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.45 }, colors, zIndex: 9999 });
    const id = setInterval(() => {
      if (Date.now() > end) return clearInterval(id);
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: 9999 });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: 9999 });
    }, 60);
    return () => clearInterval(id);
  }, [days]);
  if (!days) return null;
  const m = milestoneMessage(days);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md text-center">
        <div className="mx-auto mt-2 grid h-20 w-20 place-items-center rounded-full bg-accent/15">
          <Flame className="h-10 w-10 text-accent" strokeWidth={1.6} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{days}-day streak</p>
        <DialogTitle className="font-display text-3xl text-primary">{m.title}</DialogTitle>
        <DialogDescription className="text-base leading-relaxed">{m.body}</DialogDescription>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border bg-secondary/50 px-2 py-3">
              <div className="font-display text-2xl text-primary">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <Button className="mt-2 w-full" onClick={onClose}>Continue learning</Button>
      </DialogContent>
    </Dialog>
  );
}
