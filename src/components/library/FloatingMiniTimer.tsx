import React from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useLibraryTimer } from "@/contexts/LibraryTimerContext";
import { subjectLabel } from "@/lib/subjects";
import { formatFocusDuration } from "@/lib/apothecary";
import { Play, Pause, Flame, ChevronRight } from "lucide-react";

export function FloatingMiniTimer() {
  const { state, pauseTimer, resumeTimer } = useLibraryTimer();
  const loc = useLocation();
  const navigate = useNavigate();

  // Only show when timer is active or running, and NOT currently on the library page
  if ((!state.isRunning && state.elapsedSeconds === 0) || loc.pathname.startsWith("/library")) {
    return null;
  }

  const isPomodoro = state.mode === "pomodoro";
  const displaySeconds = isPomodoro
    ? Math.max(0, state.targetSeconds - state.elapsedSeconds)
    : state.elapsedSeconds;

  const progressPercent = isPomodoro
    ? Math.min(100, Math.floor((state.elapsedSeconds / state.targetSeconds) * 100))
    : Math.min(100, Math.floor((state.elapsedSeconds / 3600) * 100));

  return (
    <div
      role="region"
      aria-label="Active Focus Timer"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-primary/25 bg-card/95 px-3 py-1.5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-primary/50 sm:bottom-6 sm:right-6"
    >
      {/* Mini glowing apothecary indicator */}
      <div
        className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 overflow-hidden cursor-pointer"
        onClick={() => navigate({ to: "/library" })}
      >
        <div
          className="absolute bottom-0 w-full bg-accent/60 transition-all duration-300"
          style={{ height: `${progressPercent}%` }}
        />
        <Flame className={`relative z-10 h-3.5 w-3.5 ${state.isRunning ? "text-accent animate-pulse" : "text-muted-foreground"}`} />
      </div>

      {/* Info & Timer */}
      <button
        type="button"
        onClick={() => navigate({ to: "/library" })}
        className="flex flex-col text-left cursor-pointer pr-1"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate max-w-[100px]">
          {subjectLabel(state.subject)}
        </span>
        <span className="font-mono text-xs font-bold text-foreground">
          {formatFocusDuration(displaySeconds)}
        </span>
      </button>

      {/* Quick Pause / Play Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (state.isRunning) pauseTimer();
          else resumeTimer();
        }}
        aria-label={state.isRunning ? "Pause study timer" : "Resume study timer"}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        {state.isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
      </button>

      <button
        type="button"
        onClick={() => navigate({ to: "/library" })}
        aria-label="Open Library"
        className="text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
