import { cn } from "@/lib/utils";
import React, { useState } from "react";
import type { StudySession } from "@/lib/library";
import { ApothecaryFlask } from "./ApothecaryFlask";
import { subjectLabel } from "@/lib/subjects";
import { formatFocusDuration } from "@/lib/apothecary";
import { FlaskConical, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApothecaryRackProps {
  sessions: StudySession[];
}

export function ApothecaryRack({ sessions }: ApothecaryRackProps) {
  const [filter, setFilter] = useState<"all" | "completed" | "abandoned">("all");

  // Filter out any active/running sessions so completed vial shelf strictly contains finished sessions.
  // Handle any legacy or null status rows consistently so All strictly equals Sealed + Cracked.
  const isSealed = (s: StudySession) => s.status === "completed";
  const isCracked = (s: StudySession) => s.status !== "running" && s.status !== "completed";

  const completedSessions = sessions.filter(isSealed);
  const crackedSessions = sessions.filter(isCracked);

  const completedCount = completedSessions.length;
  const abandonedCount = crackedSessions.length;
  const allCount = completedCount + abandonedCount;

  const filteredSessions = sessions.filter((s) => {
    if (s.status === "running") return false;
    if (filter === "completed") return isSealed(s);
    if (filter === "abandoned") return isCracked(s);
    return isSealed(s) || isCracked(s);
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent" />
          <h3 className="font-display font-semibold text-foreground text-sm">
            Your Apothecary Rack
          </h3>
          <span className="text-xs text-muted-foreground">
            ({completedCount} sealed elixirs)
          </span>
        </div>

        {/* High-Contrast Segmented Filter Pills */}
        <div className="flex items-center gap-1 bg-[#013c44] p-1 rounded-lg border border-[#0D4347] text-xs">
          <button
            type="button"
            className={cn(
              "h-7 px-3 text-xs font-semibold rounded-md transition-all",
              filter === "all"
                ? "bg-[#E5B95C] text-[#082428] font-bold shadow-sm"
                : "bg-transparent text-[#F7F5F0]/80 hover:text-[#F7F5F0] hover:bg-[#0D4347]/80"
            )}
            onClick={() => setFilter("all")}
          >
            All ({allCount})
          </button>
          <button
            type="button"
            className={cn(
              "h-7 px-3 text-xs font-semibold rounded-md transition-all",
              filter === "completed"
                ? "bg-[#E5B95C] text-[#082428] font-bold shadow-sm"
                : "bg-transparent text-[#F7F5F0]/80 hover:text-[#F7F5F0] hover:bg-[#0D4347]/80"
            )}
            onClick={() => setFilter("completed")}
          >
            Sealed ({completedCount})
          </button>
          <button
            type="button"
            className={cn(
              "h-7 px-3 text-xs font-semibold rounded-md transition-all",
              filter === "abandoned"
                ? "bg-destructive text-white font-bold shadow-sm"
                : "bg-transparent text-rose-300 hover:text-rose-100 hover:bg-destructive/20"
            )}
            onClick={() => setFilter("abandoned")}
          >
            Cracked ({abandonedCount})
          </button>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="font-display text-sm font-medium text-foreground">Apothecary Rack is empty</p>
          <p className="max-w-sm mx-auto">
            Complete a Pomodoro or stopwatch focus session above to distill and seal your first elixir vial.
          </p>
        </div>
      ) : (
        /* The Wooden Apothecary Display Shelf */
        <div className="relative rounded-lg bg-gradient-to-b from-card/80 to-muted/40 p-4 border border-border/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredSessions.slice(0, 18).map((session) => {
              const minutes = Math.floor(session.duration_seconds / 60);
              const dateStr = new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                month: "short",
                day: "numeric",
              }).format(new Date(session.started_at));

              return (
                <div
                  key={session.id}
                  className="flex flex-col items-center justify-between rounded-lg border border-border/50 bg-background/80 p-3 text-center shadow-sm hover:border-accent/40 transition-all hover:scale-[1.02]"
                >
                  <ApothecaryFlask
                    fillPercent={100}
                    durationMinutes={minutes}
                    status={session.status}
                    size={84}
                    showGlow={session.status === "completed"}
                    showLabels={false}
                  />
                  <div className="mt-2 w-full min-w-0 flex flex-col gap-1.5 items-center">
                    {isCracked(session) ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-destructive/15 text-destructive border border-destructive/30 shadow-xs whitespace-nowrap">
                        CRACKED VIAL
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full bg-accent/15 text-accent-foreground border border-accent/30 whitespace-nowrap">
                        SEALED VIAL
                      </span>
                    )}
                    <p className="font-semibold text-xs text-foreground truncate w-full" title={subjectLabel(session.subject)}>
                      {subjectLabel(session.subject)}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {formatFocusDuration(session.duration_seconds)}
                    </p>
                    {session.intent_note && (
                      <p className="text-[10px] text-muted-foreground/80 truncate w-full mt-0.5" title={session.intent_note}>
                        "{session.intent_note}"
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 block">
                      {dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
