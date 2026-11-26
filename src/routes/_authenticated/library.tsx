import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { fetchProfile } from "@/lib/profile";
import { SUBJECT_ORDER, subjectLabel } from "@/lib/subjects";
import { useLibraryTimer, type TimerMode } from "@/contexts/LibraryTimerContext";
import { fetchUserStudySessions } from "@/lib/library";
import { formatFocusDuration } from "@/lib/apothecary";
import { ambientSound, SOUNDSCAPES, type SoundscapePreset } from "@/lib/ambient-sound";
import { ApothecaryFlask } from "@/components/library/ApothecaryFlask";
import { ApothecaryRack } from "@/components/library/ApothecaryRack";
import { StudyAnalyticsTimeline } from "@/components/library/StudyAnalyticsTimeline";
import { LibraryLeaderboards } from "@/components/library/LibraryLeaderboards";
import { StudyBuddiesTab } from "@/components/library/StudyBuddiesTab";
import { StudyGroupsTab } from "@/components/library/StudyGroupsTab";
import { ShareableStudyCardModal } from "@/components/library/ShareableStudyCard";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Target,
  ShieldAlert,
  CheckCircle2,
  FlaskConical,
  Trophy,
  Users,
  BarChart2,
  Timer,
  Compass,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const { state: timerState, startTimer, pauseTimer, resumeTimer, giveUpSession, completeSession } = useLibraryTimer();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => (user ? fetchProfile(user.id) : Promise.resolve(null)),
    enabled: !!user,
  });

  const sessionsQuery = useQuery({
    queryKey: ["user_study_sessions", user?.id],
    queryFn: () => (user ? fetchUserStudySessions(user.id) : Promise.resolve([])),
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Query MCQs solved today (IST)
  const todayMCQQuery = useQuery({
    queryKey: ["today_attempts_count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const nowIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const istStart = new Date(`${nowIST}T00:00:00+05:30`).toISOString();
      const { count } = await supabase
        .from("attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", istStart);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Local Timer Setup Configuration
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECT_ORDER[0]!);
  const [selectedMode, setSelectedMode] = useState<TimerMode>("pomodoro");
  const [intentGoal, setIntentGoal] = useState("");
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  const [dailyGoalHours, setDailyGoalHours] = useState(4);

  // Soundscape audio state
  const [soundscapeEnabled, setSoundscapeEnabled] = useState(false);
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapePreset>("rain");
  const [soundVolume, setSoundVolume] = useState(0.5);

  const profile = profileQuery.data ?? null;
  const sessions = sessionsQuery.data ?? [];

  // Update daily goal if profile exists
  useEffect(() => {
    if (profile?.daily_focus_goal_minutes) {
      setDailyGoalHours(Math.max(1, Math.round(profile.daily_focus_goal_minutes / 60)));
    }
  }, [profile?.daily_focus_goal_minutes]);

  // Handle ambient sound engine changes
  useEffect(() => {
    if (!ambientSound) return;
    if (soundscapeEnabled) {
      ambientSound.setVolume(soundVolume);
      ambientSound.play(activeSoundscape);
    } else {
      ambientSound.stop();
    }
    return () => {
      if (ambientSound) ambientSound.stop();
    };
  }, [soundscapeEnabled, activeSoundscape]);

  const handleVolumeChange = (newVal: number[]) => {
    const val = newVal[0] ?? 0.5;
    setSoundVolume(val);
    if (ambientSound) ambientSound.setVolume(val);
  };

  // Today's stats calculation (IST)
  const { todayTotalSeconds, todayCompletedVials } = useMemo(() => {
    const nowIST = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    let totalSec = 0;
    let completedVials = 0;

    sessions.forEach((s) => {
      const sDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(s.started_at));

      if (sDate === nowIST) {
        if (s.status === "completed") {
          totalSec += s.duration_seconds;
          completedVials++;
        }
      }
    });

    // Add currently active session elapsed seconds
    if (timerState.isRunning && timerState.startedAtTimestamp) {
      totalSec += timerState.elapsedSeconds;
    }

    return { todayTotalSeconds: totalSec, todayCompletedVials: completedVials };
  }, [sessions, timerState.isRunning, timerState.elapsedSeconds, timerState.startedAtTimestamp]);

  // Goal ring percentage
  const goalTargetSeconds = dailyGoalHours * 3600;
  const goalProgressPercent = Math.min(100, Math.round((todayTotalSeconds / goalTargetSeconds) * 100));

  // Current session timer display
  const isPomodoro = timerState.mode === "pomodoro";
  const timerDisplaySeconds = isPomodoro
    ? Math.max(0, timerState.targetSeconds - timerState.elapsedSeconds)
    : timerState.elapsedSeconds;

  const currentDistillationPercent = isPomodoro
    ? Math.min(100, Math.floor((timerState.elapsedSeconds / timerState.targetSeconds) * 100))
    : Math.min(100, Math.floor((timerState.elapsedSeconds / (pomodoroMinutes * 60)) * 100));

  const handleStartFocus = async () => {
    await startTimer({
      mode: selectedMode,
      subject: selectedSubject,
      intentNote: intentGoal,
      targetMinutes: pomodoroMinutes,
      isDeepFocus,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6 space-y-6 pb-24">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Study Sanctuary
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-foreground">
              The Elixir Library
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
              Immersive focus timers, procedural ambient soundscapes, apothecary alchemy, batchmate study groups, and IST leaderboards.
            </p>
          </div>

          {/* Share Today's Progress Button */}
          {user && (
            <ShareableStudyCardModal
              userName={profile?.full_name || user.email || "Doctor"}
              userHandle={profile?.handle ?? null}
              college={profile?.college ?? null}
              todaySeconds={todayTotalSeconds}
              completedVials={todayCompletedVials}
              mcqsSolvedToday={todayMCQQuery.data ?? 0}
            />
          )}
        </div>
      </section>

      {/* Main Feature Tabs */}
      <Tabs defaultValue="focus" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/70 gap-1 rounded-xl">
          <TabsTrigger value="focus" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background">
            <Timer className="h-3.5 w-3.5 text-primary" /> Focus
          </TabsTrigger>
          <TabsTrigger value="apothecary" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background">
            <FlaskConical className="h-3.5 w-3.5 text-amber-500" /> Apothecary
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background">
            <BarChart2 className="h-3.5 w-3.5 text-accent" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="leaderboards" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background">
            <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Ranks
          </TabsTrigger>
          <TabsTrigger value="buddies" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background">
            <Users className="h-3.5 w-3.5 text-emerald-500" /> Buddies
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-xs py-2 gap-1.5 data-[state=active]:bg-background">
            <Compass className="h-3.5 w-3.5 text-sky-500" /> Groups
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: FOCUS SANCTUARY ================= */}
        <TabsContent value="focus" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Focus Timer & Controls */}
            <div className="md:col-span-7 rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm space-y-5">
              {/* Timer Mode Pills */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
                  <Button
                    size="sm"
                    variant={selectedMode === "pomodoro" ? "default" : "ghost"}
                    disabled={timerState.isRunning}
                    className="h-7 text-xs px-3"
                    onClick={() => setSelectedMode("pomodoro")}
                  >
                    Pomodoro
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedMode === "stopwatch" ? "default" : "ghost"}
                    disabled={timerState.isRunning}
                    className="h-7 text-xs px-3"
                    onClick={() => setSelectedMode("stopwatch")}
                  >
                    Stopwatch
                  </Button>
                </div>

                {/* Strict Deep Focus Mode Switch */}
                <Button
                  size="sm"
                  variant={isDeepFocus ? "destructive" : "outline"}
                  disabled={timerState.isRunning}
                  onClick={() => setIsDeepFocus(!isDeepFocus)}
                  className="h-7 text-xs gap-1.5 border-destructive/30"
                  title="If enabled, leaving this tab for >10s cracks your apothecary flask"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {isDeepFocus ? "Deep Focus: ON" : "Deep Focus: OFF"}
                </Button>
              </div>

              {/* Subject Selector & Goal Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Medical Subject</Label>
                  <select
                    disabled={timerState.isRunning}
                    value={timerState.isRunning ? timerState.subject : selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SUBJECT_ORDER.map((subj) => (
                      <option key={subj} value={subj}>
                        {subjectLabel(subj)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMode === "pomodoro" && (
                  <div>
                    <Label className="text-xs font-semibold">Preset Focus Time</Label>
                    <div className="flex gap-1.5 mt-1">
                      {[25, 50, 90].map((mins) => (
                        <Button
                          key={mins}
                          size="sm"
                          disabled={timerState.isRunning}
                          variant={pomodoroMinutes === mins ? "default" : "outline"}
                          className="h-8 text-xs flex-1"
                          onClick={() => setPomodoroMinutes(mins)}
                        >
                          {mins}m
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Session Intent Goal Note */}
              <div>
                <Label className="text-xs font-semibold">Goal for this session (Optional)</Label>
                <Input
                  disabled={timerState.isRunning}
                  value={timerState.isRunning ? timerState.intentNote : intentGoal}
                  onChange={(e) => setIntentGoal(e.target.value)}
                  placeholder="e.g. Pathology Neoplasia PYQs or 50 Surgery Deck cards..."
                  className="mt-1 text-xs h-8"
                  maxLength={100}
                />
              </div>

              {/* Main Clock Face & Daily Goal Progress Ring */}
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4 border-y border-border/40">
                {/* Clock Display */}
                <div className="text-center">
                  <div className="font-mono text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
                    {formatFocusDuration(timerDisplaySeconds)}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span>{subjectLabel(timerState.isRunning ? timerState.subject : selectedSubject)}</span>
                    {timerState.isDeepFocus && <span className="text-destructive font-bold">• Strict</span>}
                  </div>
                </div>

                {/* Daily Goal Circular Progress */}
                <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border border-border/40">
                  <div className="relative h-14 w-14 flex items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-muted/60"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-accent transition-all duration-700"
                        strokeDasharray={`${goalProgressPercent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <Target className="absolute h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Today's Goal</span>
                    <p className="font-mono text-sm font-bold text-foreground">
                      {formatFocusDuration(todayTotalSeconds)} / {dailyGoalHours}h
                    </p>
                    <span className="text-[10px] text-accent font-semibold">{goalProgressPercent}% completed</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Start, Pause, Resume, Give Up, Complete */}
              <div className="flex items-center gap-3 pt-2">
                {!timerState.isRunning && timerState.elapsedSeconds === 0 ? (
                  <Button
                    onClick={handleStartFocus}
                    size="lg"
                    className="w-full h-11 text-sm font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  >
                    <Play className="h-4 w-4" /> Start Focus Session
                  </Button>
                ) : (
                  <>
                    {timerState.isRunning ? (
                      <Button
                        onClick={pauseTimer}
                        variant="secondary"
                        className="flex-1 h-11 font-semibold gap-2 text-foreground"
                      >
                        <Pause className="h-4 w-4" /> Pause
                      </Button>
                    ) : (
                      <Button
                        onClick={resumeTimer}
                        className="flex-1 h-11 font-semibold gap-2 bg-primary text-primary-foreground"
                      >
                        <Play className="h-4 w-4" /> Resume
                      </Button>
                    )}

                    <Button
                      onClick={giveUpSession}
                      variant="outline"
                      className="h-11 px-4 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs font-semibold gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Give Up
                    </Button>

                    <Button
                      onClick={completeSession}
                      className="h-11 px-4 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Seal Vial
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Visual Apothecary Flask & Procedural Soundscapes */}
            <div className="md:col-span-5 space-y-5">
              {/* Apothecary Distillation Flask Live Display */}
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/20 p-5 text-center shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Apothecary Alembic
                  </span>
                  <span className="font-mono text-xs font-bold text-accent">
                    {currentDistillationPercent}% Distilled
                  </span>
                </div>

                <div className="py-2 flex justify-center">
                  <ApothecaryFlask
                    fillPercent={currentDistillationPercent}
                    durationMinutes={Math.floor(timerState.elapsedSeconds / 60)}
                    status={timerState.isRunning ? "running" : "completed"}
                    size={170}
                  />
                </div>

                <p className="text-[11px] text-muted-foreground italic px-2">
                  "Sustained focus transforms raw effort into the sealed elixir of clinical intuition."
                </p>
              </div>

              {/* Ambient Soundscapes Panel */}
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {soundscapeEnabled ? (
                      <Volume2 className="h-4 w-4 text-accent animate-pulse" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h4 className="font-display font-semibold text-foreground text-xs uppercase tracking-wider">
                      Ambient Soundscapes
                    </h4>
                  </div>
                  <Button
                    size="sm"
                    variant={soundscapeEnabled ? "default" : "outline"}
                    className="h-6 text-[11px] px-2.5"
                    onClick={() => setSoundscapeEnabled(!soundscapeEnabled)}
                  >
                    {soundscapeEnabled ? "Playing" : "Sound: Off"}
                  </Button>
                </div>

                {/* Soundscape Presets */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {SOUNDSCAPES.map((sound) => (
                    <Button
                      key={sound.id}
                      size="sm"
                      variant={activeSoundscape === sound.id ? "default" : "secondary"}
                      className="h-8 text-xs justify-start px-2.5 truncate"
                      onClick={() => {
                        setActiveSoundscape(sound.id);
                        if (!soundscapeEnabled) setSoundscapeEnabled(true);
                      }}
                    >
                      {sound.label}
                    </Button>
                  ))}
                </div>

                {/* Volume Slider */}
                {soundscapeEnabled && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Volume</span>
                    <Slider
                      value={[soundVolume]}
                      max={1}
                      step={0.05}
                      onValueChange={handleVolumeChange}
                      className="flex-1"
                    />
                    <span className="font-mono text-[10px] text-muted-foreground w-6 text-right">
                      {Math.round(soundVolume * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ================= TAB 2: APOTHECARY RACK ================= */}
        <TabsContent value="apothecary">
          <ApothecaryRack sessions={sessions} />
        </TabsContent>

        {/* ================= TAB 3: ANALYTICS & TIMELINE ================= */}
        <TabsContent value="analytics">
          <StudyAnalyticsTimeline sessions={sessions} />
        </TabsContent>

        {/* ================= TAB 4: LEADERBOARDS ================= */}
        <TabsContent value="leaderboards">
          {user && <LibraryLeaderboards currentUserId={user.id} currentUserProfile={profile} />}
        </TabsContent>

        {/* ================= TAB 5: STUDY BUDDIES ================= */}
        <TabsContent value="buddies">
          {user && <StudyBuddiesTab currentUserId={user.id} profile={profile} />}
        </TabsContent>

        {/* ================= TAB 6: STUDY GROUPS ================= */}
        <TabsContent value="groups">
          {user && <StudyGroupsTab currentUserId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
