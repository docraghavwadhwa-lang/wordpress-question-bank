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

  const filteredSessions = sessions.filter((s) => {
    if (s.status === "running") return false;
    if (filter === "completed") return s.status === "completed";
    if (filter === "abandoned") return s.status === "abandoned";
    return true;
  });

  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const abandonedCount = sessions.filter((s) => s.status === "abandoned").length;

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

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/40 text-xs">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "ghost"}
            className="h-6 px-2.5 text-[11px]"
            onClick={() => setFilter("all")}
          >
            All ({sessions.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "completed" ? "default" : "ghost"}
            className="h-6 px-2.5 text-[11px]"
            onClick={() => setFilter("completed")}
          >
            Sealed ({completedCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "abandoned" ? "default" : "ghost"}
            className="h-6 px-2.5 text-[11px] text-destructive hover:text-destructive"
            onClick={() => setFilter("abandoned")}
          >
            Cracked ({abandonedCount})
          </Button>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                    size={90}
                    showGlow={session.status === "completed"}
                  />
                  <div className="mt-2 w-full min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {subjectLabel(session.subject)}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {formatFocusDuration(session.duration_seconds)}
                    </p>
                    {session.intent_note && (
                      <p className="italic text-[10px] text-muted-foreground/80 truncate mt-0.5" title={session.intent_note}>
                        "{session.intent_note}"
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 block mt-1">
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
