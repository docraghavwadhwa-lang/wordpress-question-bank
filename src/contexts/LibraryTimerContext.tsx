import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { abandonStudySession, completeStudySession, createStudySession } from "@/lib/library";
import { toast } from "sonner";
import { SUBJECT_ORDER, subjectLabel } from "@/lib/subjects";

export type TimerMode = "stopwatch" | "pomodoro";

export interface LibraryTimerState {
  isRunning: boolean;
  isPaused: boolean;
  mode: TimerMode;
  subject: string;
  intentNote: string;
  sessionTitle: string;
  elapsedSeconds: number;
  targetSeconds: number; // For pomodoro
  breakSeconds: number;
  isBreak: boolean;
  sessionId: string | null;
  startedAtTimestamp: number | null; // Wall-clock timestamp when current run segment started
  sessionStartWallTime: number | null; // Wall-clock timestamp when total session began
  pausedAtTimestamp: number | null;
  pauseSecondsElapsed: number; // Capped at 300s (5m)
}

interface LibraryTimerContextValue {
  state: LibraryTimerState;
  startTimer: (config: {
    mode: TimerMode;
    subject: string;
    intentNote?: string;
    sessionTitle?: string;
    targetMinutes?: number;
    breakMinutes?: number;
  }) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelGracefully: () => Promise<void>;
  giveUpSession: () => Promise<void>;
  completeSession: () => Promise<void>;
  setSubject: (s: string) => void;
  setTargetMinutes: (minutes: number) => void;
}

const STORAGE_KEY = "elixir_library_timer_state_v2";
const MAX_PAUSE_SECONDS = 300; // 5 minutes max pause

const defaultState: LibraryTimerState = {
  isRunning: false,
  isPaused: false,
  mode: "pomodoro",
  subject: SUBJECT_ORDER[0],
  intentNote: "",
  sessionTitle: "",
  elapsedSeconds: 0,
  targetSeconds: 25 * 60,
  breakSeconds: 5 * 60,
  isBreak: false,
  sessionId: null,
  startedAtTimestamp: null,
  sessionStartWallTime: null,
  pausedAtTimestamp: null,
  pauseSecondsElapsed: 0,
};

const LibraryTimerContext = createContext<LibraryTimerContextValue | null>(null);

export function LibraryTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<LibraryTimerState>(() => {
    if (typeof window === "undefined") return defaultState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: LibraryTimerState = JSON.parse(saved);
        const now = Date.now();
        // If it was running in background, recalculate elapsed from wall clock
        if (parsed.isRunning && parsed.startedAtTimestamp) {
          const additionalSec = Math.max(0, Math.floor((now - parsed.startedAtTimestamp) / 1000));
          const updatedElapsed = parsed.elapsedSeconds + additionalSec;
          return {
            ...parsed,
            elapsedSeconds: updatedElapsed,
            startedAtTimestamp: now,
          };
        }
        // If it was paused, calculate how long it was paused
        if (parsed.isPaused && parsed.pausedAtTimestamp) {
          const pauseInc = Math.max(0, Math.floor((now - parsed.pausedAtTimestamp) / 1000));
          const totalPause = parsed.pauseSecondsElapsed + pauseInc;
          if (totalPause >= MAX_PAUSE_SECONDS) {
            // Auto resume if pause limit exceeded
            return {
              ...parsed,
              isPaused: false,
              isRunning: true,
              pauseSecondsElapsed: 0,
              startedAtTimestamp: now,
              pausedAtTimestamp: null,
            };
          }
          return {
            ...parsed,
            pauseSecondsElapsed: totalPause,
            pausedAtTimestamp: now,
          };
        }
        return parsed;
      }
    } catch {
      /* ignore parse errors */
    }
    return defaultState;
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  // Main ticking timer (updates every 1s and re-syncs with wall clock timestamp)
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = window.setInterval(() => {
      setState((prev) => {
        if (!prev.isRunning || !prev.startedAtTimestamp) return prev;
        const now = Date.now();
        const deltaSec = Math.max(1, Math.floor((now - prev.startedAtTimestamp) / 1000));
        const nextElapsed = prev.elapsedSeconds + deltaSec;

        // Auto-complete Pomodoro focus period
        if (prev.mode === "pomodoro" && !prev.isBreak && nextElapsed >= prev.targetSeconds) {
          void handleAutoComplete(prev);
          return {
            ...prev,
            isRunning: false,
            isPaused: false,
            elapsedSeconds: prev.targetSeconds,
            startedAtTimestamp: null,
          };
        }

        return {
          ...prev,
          elapsedSeconds: nextElapsed,
          startedAtTimestamp: now,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning, state.mode, state.isBreak, state.targetSeconds]);

  // Pause limit interval (caps pause at 5 minutes)
  useEffect(() => {
    if (!state.isPaused) return;

    const pauseInterval = window.setInterval(() => {
      setState((prev) => {
        if (!prev.isPaused) return prev;
        const nextPause = prev.pauseSecondsElapsed + 1;
        if (nextPause >= MAX_PAUSE_SECONDS) {
          toast.warning("Pause limit (5 minutes) reached. Resuming your study timer!");
          return {
            ...prev,
            isPaused: false,
            isRunning: true,
            pauseSecondsElapsed: 0,
            startedAtTimestamp: Date.now(),
            pausedAtTimestamp: null,
          };
        }
        return {
          ...prev,
          pauseSecondsElapsed: nextPause,
        };
      });
    }, 1000);

    return () => clearInterval(pauseInterval);
  }, [state.isPaused]);

  async function handleAutoComplete(curr: LibraryTimerState) {
    if (curr.sessionId) {
      try {
        await completeStudySession(curr.sessionId, curr.targetSeconds);
        toast.success(`Pomodoro completed! Sealed ${subjectLabel(curr.subject)} flask added to your Apothecary.`);
      } catch (err) {
        console.error("Failed to complete session in database:", err);
      }
    }
  }

  const startTimer: LibraryTimerContextValue["startTimer"] = async (config) => {
    let createdId: string | null = null;
    const targetSec = (config.targetMinutes ?? 25) * 60;
    const breakSec = (config.breakMinutes ?? 5) * 60;

    const now = Date.now();

    if (user?.id) {
      try {
        createdId = await createStudySession({
          userId: user.id,
          subject: config.subject,
          mode: config.mode,
          intentNote: config.intentNote,
          targetSeconds: config.mode === "pomodoro" ? targetSec : undefined,
          isDeepFocus: false,
        });
      } catch (err) {
        console.error("Could not record session start in DB:", err);
      }
    }

    setState({
      isRunning: true,
      isPaused: false,
      mode: config.mode,
      subject: config.subject,
      intentNote: config.intentNote || "",
      sessionTitle: config.sessionTitle || "",
      elapsedSeconds: 0,
      targetSeconds: targetSec,
      breakSeconds: breakSec,
      isBreak: false,
      sessionId: createdId,
      startedAtTimestamp: now,
      sessionStartWallTime: now,
      pausedAtTimestamp: null,
      pauseSecondsElapsed: 0,
    });

    toast.info(`Focus session started: ${subjectLabel(config.subject)}`);
  };

  const pauseTimer = () => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: true,
      pausedAtTimestamp: Date.now(),
    }));
  };

  const resumeTimer = () => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      startedAtTimestamp: Date.now(),
      pausedAtTimestamp: null,
    }));
  };

  // 10-Second Grace Period Cancel: Does not crack the vial
  const cancelGracefully = async () => {
    const curr = stateRef.current;
    if (curr.sessionId) {
      try {
        // Abandon with 0 elapsed so it doesn't count or mark as cracked
        await abandonStudySession(curr.sessionId, 0);
      } catch (e) {
        console.error("Could not cancel session:", e);
      }
    }
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      sessionId: null,
      elapsedSeconds: 0,
      sessionStartWallTime: null,
      startedAtTimestamp: null,
      pausedAtTimestamp: null,
      pauseSecondsElapsed: 0,
    }));
    toast.info("Session cancelled cleanly (within 10-second grace period).");
  };

  const giveUpSession = async () => {
    const curr = stateRef.current;
    if (curr.sessionId) {
      try {
        await abandonStudySession(curr.sessionId, curr.elapsedSeconds);
        toast.info("Session given up. Cracked vial stored in your Apothecary rack.");
      } catch (err) {
        console.error(err);
      }
    }
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      sessionId: null,
      elapsedSeconds: 0,
      sessionStartWallTime: null,
      startedAtTimestamp: null,
      pausedAtTimestamp: null,
      pauseSecondsElapsed: 0,
    }));
  };

  const completeSession = async () => {
    const curr = stateRef.current;
    if (curr.sessionId && curr.elapsedSeconds >= 10) {
      try {
        await completeStudySession(curr.sessionId, curr.elapsedSeconds);
        toast.success(`Session sealed! Your ${subjectLabel(curr.subject)} flask is safely racked.`);
      } catch (err) {
        console.error(err);
      }
    }
    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      sessionId: null,
      elapsedSeconds: 0,
      sessionStartWallTime: null,
      startedAtTimestamp: null,
      pausedAtTimestamp: null,
      pauseSecondsElapsed: 0,
    }));
  };

  const setSubject = (subject: string) => {
    setState((prev) => ({ ...prev, subject }));
  };

  const setTargetMinutes = (minutes: number) => {
    const clamped = Math.max(10, Math.min(180, minutes));
    setState((prev) => ({
      ...prev,
      targetSeconds: clamped * 60,
    }));
  };

  return (
    <LibraryTimerContext.Provider
      value={{
        state,
        startTimer,
        pauseTimer,
        resumeTimer,
        cancelGracefully,
        giveUpSession,
        completeSession,
        setSubject,
        setTargetMinutes,
      }}
    >
      {children}
    </LibraryTimerContext.Provider>
  );
}

export function useLibraryTimer() {
  const ctx = useContext(LibraryTimerContext);
  if (!ctx) throw new Error("useLibraryTimer must be used within LibraryTimerProvider");
  return ctx;
}
