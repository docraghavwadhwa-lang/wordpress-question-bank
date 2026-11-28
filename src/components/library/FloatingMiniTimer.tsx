import React from "react";
import { useLibraryTimer } from "@/contexts/LibraryTimerContext";
import { formatFocusDuration } from "@/lib/apothecary";
import { Play, Pause } from "lucide-react";

/** Slim floating focus pill above bottom nav when timer is running and minimized */
export function FloatingMiniTimer() {
  const { state, isOverlayOpen, openOverlay, pauseTimer, resumeTimer } = useLibraryTimer();

  // Only show when timer is active/running/paused, and overlay is minimized/closed
  if ((!state.isRunning && !state.isPaused) || isOverlayOpen) {
    return null;
  }

  const isPomodoro = state.mode === "pomodoro";
  const displaySeconds = isPomodoro
    ? Math.max(0, state.targetSeconds - state.elapsedSeconds)
    : state.elapsedSeconds;

  return (
    <div
      role="region"
      aria-label="Active Focus Timer"
      onClick={openOverlay}
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-[#E5B95C]/40 bg-[#082428]/95 px-3.5 py-1.5 shadow-2xl backdrop-blur-md transition-all duration-200 hover:border-[#E5B95C] hover:scale-105 cursor-pointer sm:bottom-20 sm:right-6"
    >
      <span className="relative flex h-2 w-2">
        {state.isRunning && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E5B95C] opacity-75" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E5B95C]" />
      </span>

      <span className="font-mono text-xs font-bold text-[#E5B95C] tracking-wide">
        ⏱ {formatFocusDuration(displaySeconds)}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (state.isRunning) pauseTimer();
          else resumeTimer();
        }}
        aria-label={state.isRunning ? "Pause focus timer" : "Resume focus timer"}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0D4347] text-[#F7F5F0] hover:bg-[#165E63] transition-colors ml-0.5"
      >
        {state.isRunning ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5 ml-0.5" />}
      </button>
    </div>
  );
}
