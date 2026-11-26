import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { abandonStudySession, completeStudySession, createStudySession } from "@/lib/library";
import { toast } from "sonner";
import { SUBJECT_ORDER, subjectLabel } from "@/lib/subjects";

export type TimerMode = "stopwatch" | "pomodoro";

export interface LibraryTimerState {
  isRunning: boolean;
  mode: TimerMode;
  subject: string;
  intentNote: string;
  elapsedSeconds: number;
  targetSeconds: number; // For pomodoro
  breakSeconds: number;
  isBreak: boolean;
  isDeepFocus: boolean;
  sessionId: string | null;
  startedAtTimestamp: number | null;
}

interface LibraryTimerContextValue {
  state: LibraryTimerState;
  startTimer: (config: {
    mode: TimerMode;
    subject: string;
    intentNote?: string;
    targetMinutes?: number;
    breakMinutes?: number;
    isDeepFocus: boolean;
  }) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  giveUpSession: () => Promise<void>;
  completeSession: () => Promise<void>;
  setSubject: (s: string) => void;
}

const STORAGE_KEY = "elixir_library_timer_state_v1";

const defaultState: LibraryTimerState = {
  isRunning: false,
  mode: "pomodoro",
  subject: SUBJECT_ORDER[0],
  intentNote: "",
  elapsedSeconds: 0,
  targetSeconds: 25 * 60,
  breakSeconds: 5 * 60,
  isBreak: false,
  isDeepFocus: false,
  sessionId: null,
  startedAtTimestamp: null,
};

const LibraryTimerContext = createContext<LibraryTimerContextValue | null>(null);

export function LibraryTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<LibraryTimerState>(() => {
    if (typeof window === "undefined") return defaultState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isRunning && parsed.startedAtTimestamp) {
          const now = Date.now();
          const additionalSec = Math.max(0, Math.floor((now - parsed.startedAtTimestamp) / 1000));
          return {
            ...parsed,
            elapsedSeconds: parsed.elapsedSeconds + additionalSec,
            startedAtTimestamp: now,
          };
        }
        return parsed;
      }
    } catch {
      /* ignore storage parsing error */
    }
    return defaultState;
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  // Main ticking interval
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = window.setInterval(() => {
      setState((prev) => {
        if (!prev.isRunning) return prev;
        const nextElapsed = prev.elapsedSeconds + 1;

        // Auto-complete Pomodoro focus period
        if (prev.mode === "pomodoro" && !prev.isBreak && nextElapsed >= prev.targetSeconds) {
          void handleAutoComplete(prev);
          return {
            ...prev,
            isRunning: false,
            elapsedSeconds: prev.targetSeconds,
          };
        }

        return {
          ...prev,
          elapsedSeconds: nextElapsed,
          startedAtTimestamp: Date.now(),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning, state.mode, state.isBreak, state.targetSeconds]);

  // Deep Focus visibility listener
  useEffect(() => {
    if (!state.isRunning || !state.isDeepFocus) return;

    let hiddenTimeout: number | null = null;

    const handleVisibility = () => {
      if (document.hidden) {
        // Tab hidden: Start 10-second grace countdown
        hiddenTimeout = window.setTimeout(() => {
          if (stateRef.current.isRunning && stateRef.current.isDeepFocus) {
            toast.error("Deep Focus broken! Tab was left for >10s. Your Apothecary vial has cracked.", { duration: 6000 });
            void handleDeepFocusBroken(stateRef.current);
          }
        }, 10000);
      } else {
        // Tab restored: Cancel countdown
        if (hiddenTimeout) {
          clearTimeout(hiddenTimeout);
          hiddenTimeout = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (hiddenTimeout) clearTimeout(hiddenTimeout);
    };
  }, [state.isRunning, state.isDeepFocus]);

  async function handleAutoComplete(curr: LibraryTimerState) {
    if (curr.sessionId) {
      try {
        await completeStudySession(curr.sessionId, curr.elapsedSeconds);
        toast.success(`Pomodoro completed! Sealed ${curr.subject} vial added to your Apothecary.`);
      } catch (err) {
        console.error("Failed to complete session in database:", err);
      }
    }
  }

  async function handleDeepFocusBroken(curr: LibraryTimerState) {
    if (curr.sessionId) {
      try {
        await abandonStudySession(curr.sessionId, curr.elapsedSeconds);
      } catch (e) {
        console.error(e);
      }
    }
    setState((prev) => ({
      ...prev,
      isRunning: false,
      sessionId: null,
    }));
  }

  const startTimer: LibraryTimerContextValue["startTimer"] = async (config) => {
    let createdId: string | null = null;
    const targetSec = (config.targetMinutes ?? 25) * 60;
    const breakSec = (config.breakMinutes ?? 5) * 60;

    if (user?.id) {
      try {
        createdId = await createStudySession({
          userId: user.id,
          subject: config.subject,
          mode: config.mode,
          intentNote: config.intentNote,
          targetSeconds: config.mode === "pomodoro" ? targetSec : undefined,
          isDeepFocus: config.isDeepFocus,
        });
      } catch (err) {
        console.error("Could not record session start in DB:", err);
      }
    }

    setState({
      isRunning: true,
      mode: config.mode,
      subject: config.subject,
      intentNote: config.intentNote || "",
      elapsedSeconds: 0,
      targetSeconds: targetSec,
      breakSeconds: breakSec,
      isBreak: false,
      isDeepFocus: config.isDeepFocus,
      sessionId: createdId,
      startedAtTimestamp: Date.now(),
    });

    toast.info(`Focus session started: ${subjectLabel(config.subject)}`);
  };

  const pauseTimer = () => {
    setState((prev) => ({ ...prev, isRunning: false }));
  };

  const resumeTimer = () => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      startedAtTimestamp: Date.now(),
    }));
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
      sessionId: null,
      elapsedSeconds: 0,
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
      sessionId: null,
      elapsedSeconds: 0,
    }));
  };

  const setSubject = (subject: string) => {
    setState((prev) => ({ ...prev, subject }));
  };

  return (
    <LibraryTimerContext.Provider
      value={{
        state,
        startTimer,
        pauseTimer,
        resumeTimer,
        giveUpSession,
        completeSession,
        setSubject,
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
