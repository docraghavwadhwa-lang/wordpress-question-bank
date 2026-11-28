import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLibraryTimer } from "@/contexts/LibraryTimerContext";
import { SUBJECT_ORDER, subjectLabel } from "@/lib/subjects";
import { formatFocusDuration } from "@/lib/apothecary";
import { ApothecaryFlask } from "./ApothecaryFlask";
import { ApothecaryRack } from "./ApothecaryRack";
import { ShareableStudyCard } from "./ShareableStudyCard";
import { AmbiencePopover } from "@/components/ambience/AmbiencePopover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Target,
  Flame,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { fetchDailyFocusTime, fetchUserSessions, type StudySession } from "@/lib/library";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

const PRESET_DURATIONS = [15, 25, 45, 60, 90, 120, 180];

export function FocusTimerOverlay() {
  const { user } = useAuth();
  const {
    state: timerState,
    isOverlayOpen,
    closeOverlay,
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelGracefully,
    giveUpSession,
    completeSession,
    setSubject,
    setTargetMinutes,
  } = useLibraryTimer();

  const [ringMinutes, setRingMinutes] = useState(
    Math.max(15, Math.min(180, Math.round(timerState.targetSeconds / 60)))
  );
  const [selectedSubject, setSelectedSubjectState] = useState(timerState.subject || SUBJECT_ORDER[0]);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [sessionGoal, setSessionGoal] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [shareCardOpen, setShareCardOpen] = useState(false);

  // Circular ring drag handling with strict clamp (15m - 180m) and no wrap-around
  const ringRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastMinutesRef = useRef(ringMinutes);

  useEffect(() => {
    lastMinutesRef.current = ringMinutes;
  }, [ringMinutes]);

  const updateRingFromAngle = useCallback(
    (clientX: number, clientY: number) => {
      if (!ringRef.current || timerState.isRunning) return;
      const rect = ringRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Angle from top (12 o'clock) clockwise in radians
      let theta = Math.atan2(dy, dx) + Math.PI / 2;
      if (theta < 0) theta += 2 * Math.PI;

      // Fraction of full circle (0 to 1) mapped to 15m - 180m
      const frac = theta / (2 * Math.PI);
      let mins = Math.round(15 + frac * (180 - 15));
      const prev = lastMinutesRef.current;

      // Hard clamp past boundaries: eliminate 360 wrap-around
      if (prev >= 140 && mins < 50) {
        mins = 180;
      } else if (prev <= 55 && mins > 140) {
        mins = 15;
      }

      const clamped = Math.max(15, Math.min(180, mins));
      lastMinutesRef.current = clamped;
      setRingMinutes(clamped);
      setTargetMinutes(clamped);
    },
    [timerState.isRunning, setTargetMinutes]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (timerState.isRunning) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    updateRingFromAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || timerState.isRunning) return;
    updateRingFromAngle(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    setIsDragging(false);
  };

  // 10-Second Grace Period Countdown
  const secondsSinceStart = timerState.sessionStartWallTime
    ? Math.max(0, Math.floor((Date.now() - timerState.sessionStartWallTime) / 1000))
    : timerState.elapsedSeconds;
  const isWithinGracePeriod = timerState.isRunning && secondsSinceStart < 10;
  const graceSecondsRemaining = Math.max(0, 10 - secondsSinceStart);

  // Pause limit (5 min / 300s)
  const pauseSecondsLeft = Math.max(0, 300 - timerState.pauseSecondsElapsed);

  // Today focus hours
  const dailyQuery = useQuery({
    queryKey: ["daily_focus_time", user?.id],
    queryFn: () => (user?.id ? fetchDailyFocusTime(user.id) : Promise.resolve(0)),
    enabled: !!user?.id,
  });

  // Sessions for apothecary rack
  const sessionsQuery = useQuery({
    queryKey: ["study_sessions", user?.id],
    queryFn: () => (user?.id ? fetchUserSessions(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
  });

  const todayFocusSeconds = dailyQuery.data ?? 0;
  const todayFocusHours = (todayFocusSeconds / 3600).toFixed(1);

  if (!isOverlayOpen) return null;

  const isPomodoro = timerState.mode === "pomodoro";
  const displaySeconds = isPomodoro
    ? Math.max(0, timerState.targetSeconds - timerState.elapsedSeconds)
    : timerState.elapsedSeconds;

  const currentDurationMinutes = timerState.isRunning
    ? Math.round(timerState.targetSeconds / 60)
    : ringMinutes;

  // Arc calculation
  const ringRadius = 120;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeFrac = timerState.isRunning
    ? isPomodoro
      ? Math.min(1, timerState.elapsedSeconds / Math.max(1, timerState.targetSeconds))
      : Math.min(1, (timerState.elapsedSeconds % 3600) / 3600)
    : (ringMinutes - 15) / (180 - 15);

  const strokeDashoffset = ringCircumference * (1 - strokeFrac);

  // Thumb knob coordinates
  const thumbAngleRad = strokeFrac * 2 * Math.PI - Math.PI / 2;
  const thumbX = 140 + ringRadius * Math.cos(thumbAngleRad);
  const thumbY = 140 + ringRadius * Math.sin(thumbAngleRad);

  const handleConfirmStart = async () => {
    setSetupModalOpen(false);
    await startTimer({
      mode: "pomodoro",
      subject: selectedSubject,
      sessionTitle: sessionTitle.trim(),
      intentNote: sessionGoal.trim(),
      targetMinutes: ringMinutes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#082428] text-[#F7F5F0] overflow-y-auto pb-24">
      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-[#082428]/95 backdrop-blur border-b border-[#0D4347] px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeOverlay}
            className="text-[#F7F5F0]/80 hover:text-[#E5B95C] hover:bg-[#0D4347] gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Minimize to Study
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0D4347] text-[#E5B95C] border border-[#0D4347]/60">
              ⏱ {todayFocusHours}h logged today
            </span>
            <AmbiencePopover compact />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareCardOpen(true)}
              className="h-8 text-xs font-semibold text-[#082428] bg-[#E5B95C] hover:bg-[#E5B95C]/90 border-none gap-1"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6 space-y-6">
        {/* Timer container card */}
        <div className="rounded-3xl border border-[#0D4347] bg-[#082428] p-6 shadow-2xl flex flex-col items-center">
          {/* Pause warning banner */}
          {timerState.isPaused && (
            <div className="w-full mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Timer paused ({Math.floor(pauseSecondsLeft / 60)}m {pauseSecondsLeft % 60}s limit remaining)
              </span>
              <Button
                size="sm"
                onClick={resumeTimer}
                className="h-6 px-2 text-[11px] bg-amber-500 text-black font-bold hover:bg-amber-400"
              >
                Resume
              </Button>
            </div>
          )}

          {/* Grace Period banner */}
          {isWithinGracePeriod && (
            <div className="w-full mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <RotateCcw className="h-4 w-4 text-emerald-400 animate-spin" />
                Cancel cleanly without cracking vial ({graceSecondsRemaining}s left)
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={cancelGracefully}
                className="h-6 px-2 text-[11px] font-bold"
              >
                Cancel Clean
              </Button>
            </div>
          )}

          {/* Circular Ring Timer */}
          <div
            className="relative select-none touch-none cursor-pointer my-2"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <svg
              ref={ringRef}
              width={280}
              height={280}
              viewBox="0 0 280 280"
              className="transform -rotate-90 pointer-events-auto"
            >
              {/* Background track circle */}
              <circle
                cx={140}
                cy={140}
                r={ringRadius}
                fill="none"
                stroke="#0D4347"
                strokeWidth={12}
                strokeLinecap="round"
              />

              {/* Active progress arc */}
              <circle
                cx={140}
                cy={140}
                r={ringRadius}
                fill="none"
                stroke="#E5B95C"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
              />

              {/* Draggable thumb knob (visible when not running) */}
              {!timerState.isRunning && (
                <circle
                  cx={thumbX}
                  cy={thumbY}
                  r={12}
                  fill="#E5B95C"
                  stroke="#082428"
                  strokeWidth={3}
                  className="cursor-grab active:cursor-grabbing shadow-lg"
                />
              )}
            </svg>

            {/* Inner Alembic Flask & Time Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <ApothecaryFlask
                fillPercent={
                  timerState.isRunning
                    ? Math.min(100, Math.floor((timerState.elapsedSeconds / Math.max(1, timerState.targetSeconds)) * 100))
                    : 15
                }
                durationMinutes={currentDurationMinutes}
                status="running"
                size={74}
                showLabels={false}
              />

              <div className="font-mono text-3xl font-bold tracking-tight text-[#F7F5F0] mt-1">
                {timerState.isRunning
                  ? formatFocusDuration(displaySeconds)
                  : `${ringMinutes}m`}
              </div>

              <div className="text-[11px] font-semibold text-[#E5B95C] uppercase tracking-wider mt-0.5 max-w-[140px] truncate">
                {subjectLabel(selectedSubject)}
              </div>
            </div>
          </div>

          {/* Preset Duration Buttons (15m, 25m, 45m, 60m, 90m, 120m, 180m) */}
          {!timerState.isRunning && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
              {PRESET_DURATIONS.map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => {
                    setRingMinutes(dur);
                    setTargetMinutes(dur);
                  }}
                  className={`h-7 px-2.5 rounded-full text-xs font-semibold transition-all ${
                    ringMinutes === dur
                      ? "bg-[#E5B95C] text-[#082428] font-bold shadow-md scale-105"
                      : "bg-[#0D4347] text-[#F7F5F0]/80 hover:bg-[#165E63] hover:text-[#F7F5F0]"
                  }`}
                >
                  {dur}m
                </button>
              ))}
            </div>
          )}

          {/* Subject picker */}
          {!timerState.isRunning && (
            <div className="w-full mt-5 space-y-1.5">
              <Label className="text-xs font-semibold text-[#F7F5F0]/80">Focus Subject</Label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubjectState(e.target.value);
                  setSubject(e.target.value);
                }}
                className="w-full h-9 rounded-xl bg-[#0D4347]/60 border border-[#0D4347] text-xs text-[#F7F5F0] px-3 font-medium outline-none focus:border-[#E5B95C]"
              >
                {SUBJECT_ORDER.map((sub) => (
                  <option key={sub} value={sub} className="bg-[#082428] text-[#F7F5F0]">
                    {subjectLabel(sub)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Button Row */}
          <div className="w-full mt-6">
            {!timerState.isRunning ? (
              <Button
                size="lg"
                onClick={() => setSetupModalOpen(true)}
                className="w-full bg-[#E5B95C] text-[#082428] font-bold text-sm hover:bg-[#E5B95C]/90 shadow-xl gap-2"
              >
                <Play className="h-4 w-4 fill-[#082428]" /> Start {ringMinutes}m Focus Session
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {timerState.isPaused ? (
                  <Button
                    size="default"
                    onClick={resumeTimer}
                    className="bg-[#E5B95C] text-[#082428] font-bold text-xs hover:bg-[#E5B95C]/90 gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 fill-[#082428]" /> Resume
                  </Button>
                ) : (
                  <Button
                    size="default"
                    onClick={pauseTimer}
                    className="bg-[#0D4347] text-[#F7F5F0] font-semibold text-xs hover:bg-[#165E63] gap-1.5"
                  >
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </Button>
                )}

                <Button
                  size="default"
                  onClick={completeSession}
                  className="bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 gap-1.5 shadow"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Seal Vial
                </Button>

                {!isWithinGracePeriod && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={giveUpSession}
                    className="col-span-2 text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 text-xs mt-1"
                  >
                    Give Up (Cracks Apothecary Vial)
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Apothecary Rack Section */}
        <ApothecaryRack sessions={sessionsQuery.data ?? []} />
      </main>

      {/* Setup modal before starting timer */}
      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="max-w-sm bg-[#082428] border border-[#0D4347] text-[#F7F5F0] p-6 shadow-2xl">
          <DialogHeader className="text-left pb-3 border-b border-[#0D4347]">
            <DialogTitle className="text-[#E5B95C] font-display text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Session Intent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-[#F7F5F0]">Session Title (Optional)</Label>
              <Input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Pathology Neoplasia Deep Dive"
                className="mt-1 h-9 text-xs bg-[#0D4347]/60 border-[#0D4347] text-[#F7F5F0]"
                maxLength={60}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#F7F5F0]">Session Goal / Intent</Label>
              <Input
                value={sessionGoal}
                onChange={(e) => setSessionGoal(e.target.value)}
                placeholder="e.g. Master staging & 50 PYQs"
                className="mt-1 h-9 text-xs bg-[#0D4347]/60 border-[#0D4347] text-[#F7F5F0]"
                maxLength={100}
              />
            </div>

            <Button
              onClick={handleConfirmStart}
              className="w-full bg-[#E5B95C] text-[#082428] font-bold text-xs hover:bg-[#E5B95C]/90 shadow-lg mt-2"
            >
              Begin {ringMinutes}m Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shareable Study Card Dialog */}
      {shareCardOpen && (
        <ShareableStudyCard
          onClose={() => setShareCardOpen(false)}
          todayFocusHours={parseFloat(todayFocusHours)}
          sealedVialsCount={(sessionsQuery.data ?? []).filter((s) => s.status === "completed").length}
          currentStreak={0}
          currentSubject={selectedSubject}
        />
      )}
    </div>
  );
}
