import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TIMERS } from "@/lib/qbank";
import { cn } from "@/lib/utils";
import type { Pick } from "./SubjectGrid";

export function QuizSettings({
  pick,
  initialTimer,
  loading,
  message,
  onCancel,
  onStart,
}: {
  pick: Pick | null;
  initialTimer: number;
  loading: boolean;
  message?: string | undefined;
  onCancel: () => void;
  onStart: (timer: number, review?: boolean) => void;
}) {
  const [timer, setTimer] = useState(initialTimer);
  return (
    <Dialog open={!!pick} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-display text-2xl text-primary">{pick?.title}</DialogTitle>
          <DialogDescription>
            {message ?? `${pick?.subtitle ? pick.subtitle + " · " : ""}${pick?.total ? `All ${pick.total} questions` : "All questions"}`}
          </DialogDescription>
        </DialogHeader>
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
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          {pick?.kind === "bookmarks" ? (
            <>
              <Button disabled={loading} variant="secondary" onClick={() => onStart(0, true)}>Review questions & solutions</Button>
              <Button disabled={loading} onClick={() => onStart(timer)}>{loading ? "Loading…" : "Attempt bookmarked questions"}</Button>
            </>
          ) : (
            <Button disabled={loading} onClick={() => onStart(timer)}>{loading ? "Loading…" : "Start quiz"}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
