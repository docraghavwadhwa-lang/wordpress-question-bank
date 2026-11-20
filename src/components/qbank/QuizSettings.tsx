import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TIMERS } from "@/lib/qbank";
import { cn } from "@/lib/utils";
import type { Pick } from "./SubjectGrid";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck, Lightbulb } from "lucide-react";

const MODES = [
  { id: "quiz", label: "Quiz mode", icon: Lightbulb, how: ["See the answer and explanation right after each question", "Skip and revisit skipped questions before submitting"] },
  { id: "test", label: "Test mode", icon: ClipboardCheck, how: ["Answers and explanations stay hidden until you submit", "Change answers, jump between questions, then submit", "Timer counts down for the whole test"] },
] as const;

export function QuizSettings({
  pick,
  initialTimer,
  loading,
  message,
  onCancel,
  onStart,
  attempts = [],
  onReview,
}: {
  attempts?: { id: string; label: string }[];
  onReview?: (id: string) => void;
  pick: Pick | null;
  initialTimer: number;
  loading: boolean;
  message?: string | undefined;
  onCancel: () => void;
  onStart: (timer: number, review?: boolean, test?: boolean) => void;
}) {
  const [timer, setTimer] = useState(initialTimer);
  const [mode, setMode] = useState<"quiz" | "test">("quiz");
  const active = MODES.find(m => m.id === mode) ?? MODES[0];
  return (
    <Dialog open={!!pick} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-display text-2xl text-primary">{pick?.title}</DialogTitle>
          <DialogDescription>
            {message ?? `${pick?.subtitle ? pick.subtitle + " · " : ""}${pick?.total ? `${pick.total} questions · available questions depend on your plan` : "Available questions"}`}
          </DialogDescription>
        </DialogHeader>
        {message?.includes("locked") && <Button asChild variant="outline"><Link to="/plans">Unlock with Pro</Link></Button>}
        {pick?.kind !== "bookmarks" && <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mode">
            {MODES.map(m => <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={cn("flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors", mode === m.id ? "border-primary bg-secondary text-primary" : "text-foreground hover:bg-muted")}><m.icon className="h-5 w-5" />{m.label}</button>)}
          </div>
          <ul className="space-y-1 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">{active.how.map(h => <li key={h} className="flex gap-2"><span className="text-accent">•</span>{h}</li>)}</ul>
        </div>}
        {attempts.length > 0 && onReview && <div className="space-y-2 rounded-xl border px-4 py-3">
          <p className="text-sm font-semibold text-primary">Previous attempts</p>
          {attempts.map(a => <div key={a.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{a.label}</span><Button size="sm" variant="outline" disabled={loading} onClick={() => onReview(a.id)}>Review</Button></div>)}
        </div>}
        <div className="space-y-2">
          <p className="text-center text-sm font-medium text-muted-foreground">Time per question</p>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
            {TIMERS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTimer(t.value)}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold transition-colors",
                  timer === t.value ? "bg-primary text-primary-foreground shadow" : "text-foreground hover:bg-card",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className={pick?.kind === "bookmarks" ? "flex flex-col gap-2 pt-2" : "flex flex-wrap justify-center gap-3 pt-2"}>
          {pick?.kind === "bookmarks" ? (
            <>
              <Button disabled={loading} onClick={() => onStart(timer)}>{loading ? "Loading…" : "Attempt bookmarked questions"}</Button>
              <Button disabled={loading} variant="secondary" onClick={() => onStart(0, true)}>Review questions & solutions</Button>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </>
          ) : (
            <><Button variant="outline" onClick={onCancel}>Cancel</Button><Button disabled={loading} onClick={() => onStart(timer, false, mode === "test")}>{loading ? "Loading…" : mode === "test" ? "Start test" : "Start quiz"}</Button></>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
