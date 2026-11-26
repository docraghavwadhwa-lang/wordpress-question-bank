import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { fetchProfile, updateProfile } from "@/lib/profile";
import { SUBJECT_ORDER, subjectLabel } from "@/lib/subjects";
import { useLibraryTimer, type TimerMode } from "@/contexts/LibraryTimerContext";
import {
  fetchUserStudySessions,
  fetchStudyTodos,
  addStudyTodo,
  toggleStudyTodo,
  deleteStudyTodo,
  type StudyTodo,
} from "@/lib/library";
import { formatFocusDuration } from "@/lib/apothecary";
import { ambientSound, SOUNDSCAPES, type SoundscapePreset } from "@/lib/ambient-sound";
import { ApothecaryFlask } from "@/components/library/ApothecaryFlask";
import { ApothecaryRack } from "@/components/library/ApothecaryRack";
import { StudyAnalyticsTimeline } from "@/components/library/StudyAnalyticsTimeline";
import { LibraryLeaderboards } from "@/components/library/LibraryLeaderboards";
import { StudyBuddiesTab } from "@/components/library/StudyBuddiesTab";
import { StudyGroupsTab } from "@/components/library/StudyGroupsTab";
import { ShareableStudyCardModal } from "@/components/library/ShareableStudyCard";
import { StudyProfileSettingsDialog } from "@/components/library/StudyProfileSettingsDialog";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Menu,
  ArrowLeft,
  Share2,
  Headphones,
  HeadphoneOff,
  Target,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Settings,
  FlaskConical,
  Trophy,
  Users,
  BarChart2,
  Timer,
  Compass,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Volume2,
  ListTodo,
} from "lucide-react";
import { toast } from "sonner";


function getSoundscapeEmoji(preset: SoundscapePreset) {
  switch (preset) {
    case "rain": return "🌧️";
    case "library": return "📚";
    case "cafe": return "☕";
    case "forest": return "🌲";
    case "lofi": return "🎧";
    case "whitenoise": return "📻";
    case "fireplace": return "🔥";
    case "wind": return "🍃";
    default: return "🎵";
  }
}

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

type LibrarySection = "focus" | "apothecary" | "analytics" | "leaderboards" | "buddies" | "groups" | "todos" | "soundscapes";

function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const {
    state: timerState,
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelGracefully,
    giveUpSession,
    completeSession,
    setTargetMinutes,
  } = useLibraryTimer();

  // Active view section
  const [activeSection, setActiveSection] = useState<LibrarySection>("focus");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Queries
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

  // To-Do list query
  const todosQuery = useQuery({
    queryKey: ["user_study_todos", user?.id],
    queryFn: () => (user ? fetchStudyTodos(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const profile = profileQuery.data ?? null;
  const sessions = sessionsQuery.data ?? [];
  const todos = todosQuery.data ?? [];

  // Goal & Audio state
  const [dailyGoalHours, setDailyGoalHours] = useState<number>(4);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState("");

  const [soundscapeEnabled, setSoundscapeEnabled] = useState(false);
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapePreset>("rain");
  const [soundVolume, setSoundVolume] = useState(0.6);

  // Post-Time Setup Configuration Modal
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECT_ORDER[0]!);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionGoal, setSessionGoal] = useState("");

  // Ring duration in minutes (10 - 180 min)
  const [ringMinutes, setRingMinutes] = useState<number>(
    Math.round((timerState.targetSeconds || 25 * 60) / 60)
  );

  // Sync ring minutes with context
  useEffect(() => {
    if (!timerState.isRunning) {
      setRingMinutes(Math.round((timerState.targetSeconds || 25 * 60) / 60));
    }
  }, [timerState.targetSeconds, timerState.isRunning]);

  // Update daily goal if profile exists
  useEffect(() => {
    if (profile?.daily_focus_goal_minutes) {
      setDailyGoalHours(Math.max(0.5, profile.daily_focus_goal_minutes / 60));
    }
  }, [profile?.daily_focus_goal_minutes]);

  // Ambient sound engine sync
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

    const handleHeadphoneClick = () => {
    ambientSound?.unlock();
    if (soundscapeEnabled) {
      ambientSound?.stop();
      setSoundscapeEnabled(false);
      toast.info("Ambient soundscape muted");
    } else {
      ambientSound?.setVolume(soundVolume);
      ambientSound?.play(activeSoundscape);
      setSoundscapeEnabled(true);
      const label = SOUNDSCAPES.find((s) => s.id === activeSoundscape)?.label || "Ambient";
      toast.success(`Playing ${label} (looping)`);
    }
  };

  const handleSelectSoundscape = (id: SoundscapePreset) => {
    ambientSound?.unlock();
    setActiveSoundscape(id);
    ambientSound?.setVolume(soundVolume);
    ambientSound?.play(id);
    setSoundscapeEnabled(true);
    const label = SOUNDSCAPES.find((s) => s.id === id)?.label || "Ambient";
    toast.success(`Playing ${label} (looping)`);
  };

  const toggleSoundscape = () => {
    setSoundscapeEnabled((prev) => !prev);
  };

  const handleVolumeChange = (newVal: number[]) => {
    const val = newVal[0] ?? 0.6;
    setSoundVolume(val);
    if (ambientSound) ambientSound.setVolume(val);
  };

  // Today's focus calculations (IST)
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

    if (timerState.isRunning && timerState.startedAtTimestamp) {
      totalSec += timerState.elapsedSeconds;
    }

    return { todayTotalSeconds: totalSec, todayCompletedVials: completedVials };
  }, [sessions, timerState.isRunning, timerState.elapsedSeconds, timerState.startedAtTimestamp]);

  const goalTargetSeconds = dailyGoalHours * 3600;
  const goalProgressPercent = Math.min(100, Math.round((todayTotalSeconds / goalTargetSeconds) * 100));

  // Current session calculations
  const isPomodoro = timerState.mode === "pomodoro";
  const timerDisplaySeconds = isPomodoro
    ? Math.max(0, timerState.targetSeconds - timerState.elapsedSeconds)
    : timerState.elapsedSeconds;

  // 10-Second Grace Period Countdown
  const secondsSinceStart = timerState.sessionStartWallTime
    ? Math.max(0, Math.floor((Date.now() - timerState.sessionStartWallTime) / 1000))
    : timerState.elapsedSeconds;
  const isWithinGracePeriod = timerState.isRunning && secondsSinceStart < 10;
  const graceSecondsRemaining = Math.max(0, 10 - secondsSinceStart);

  // Pause limit (5 min / 300s)
  const pauseSecondsLeft = Math.max(0, 300 - timerState.pauseSecondsElapsed);

  // Circular ring drag handling
  const ringRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

      // Map 0 to 2*PI to 10 to 180 minutes
      const frac = theta / (2 * Math.PI);
      const mins = Math.round(10 + frac * 170);
      const clamped = Math.max(10, Math.min(180, mins));
      setRingMinutes(clamped);
      setTargetMinutes(clamped);
    },
    [timerState.isRunning, setTargetMinutes]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (timerState.isRunning) return;
    setIsDragging(true);
    updateRingFromAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || timerState.isRunning) return;
    updateRingFromAngle(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Start focus session after post-time setup modal
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

  // Save new daily goal
  const handleSaveGoal = async () => {
    const val = customGoalInput ? parseFloat(customGoalInput) : dailyGoalHours;
    if (val && val > 0 && user?.id) {
      setDailyGoalHours(val);
      try {
        await updateProfile(user.id, {
          daily_focus_goal_minutes: Math.round(val * 60),
        });
        toast.success(`Today's focus target updated to ${val} hrs!`);
      } catch {
        toast.error("Could not save focus target");
      }
    }
    setGoalModalOpen(false);
    setCustomGoalInput("");
  };

  // To-Do Actions
  const [newTodoText, setNewTodoText] = useState("");
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim() || !user?.id) return;
    try {
      await addStudyTodo(user.id, newTodoText);
      setNewTodoText("");
      void qc.invalidateQueries({ queryKey: ["user_study_todos"] });
      toast.success("Task added to today's list");
    } catch {
      toast.error("Failed to add task");
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    await toggleStudyTodo(id, completed);
    void qc.invalidateQueries({ queryKey: ["user_study_todos"] });
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteStudyTodo(id);
    void qc.invalidateQueries({ queryKey: ["user_study_todos"] });
  };

  // Progress for the SVG ring
  // If running: progress through current session
  // If idle: fraction of ring max (180 mins)
  const ringProgress = timerState.isRunning
    ? Math.min(1, timerState.elapsedSeconds / Math.max(1, timerState.targetSeconds))
    : (ringMinutes - 10) / 170;

  const ringRadius = 120;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - ringProgress);

  // Coordinates for the drag handle on the circle
  const handleAngle = (ringProgress * 2 * Math.PI) - Math.PI / 2;
  const handleX = 150 + ringRadius * Math.cos(handleAngle);
  const handleY = 150 + ringRadius * Math.sin(handleAngle);

  return (
    <div className="min-h-screen bg-[#165E63] dark:bg-[#082428] text-[#F7F5F0] transition-colors selection:bg-[#E5B95C] selection:text-[#082428] pb-24">
      {/* ================= TOP NAVIGATION / SANCTUARY HEADER ================= */}
      <header className="sticky top-0 z-30 border-b border-[#0D4347]/80 bg-[#165E63]/95 dark:bg-[#082428]/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          {/* Top-Left: Menu Hamburger (≡), Back, Elixir Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* 3-Line Hamburger Menu */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-[#F7F5F0] hover:bg-[#0D4347] hover:text-[#E5B95C] shrink-0"
              aria-label="Open sanctuary menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="h-8 gap-1 px-1.5 sm:px-2 text-xs text-[#F7F5F0]/80 hover:bg-[#0D4347] hover:text-[#F7F5F0] shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            {/* Sanctuary Branding & Logo */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-[#0D4347]">
              <img
                src="/elixir-header-latest.webp"
                alt="Elixir"
                className="h-4.5 sm:h-5 w-auto object-contain brightness-0 invert shrink-0"
              />
              <span className="text-xs font-display font-medium text-[#E5B95C] tracking-wide">
                Sanctuary
              </span>
            </div>
          </div>

          {/* Top-Right: Today's Goal Pill + Ambient Sound Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Today's Goal Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGoalModalOpen(true)}
              className="h-8 gap-1.5 rounded-full bg-[#0D4347]/60 hover:bg-[#0D4347] px-2.5 sm:px-3 text-xs font-medium text-[#F7F5F0] border border-[#4BA09F]/30 shrink-0"
              title="Click to edit today's focus goal"
            >
              <Target className="h-3.5 w-3.5 text-[#E5B95C]" />
              <span className="text-xs">
                {(todayTotalSeconds / 3600).toFixed(1)} / {dailyGoalHours}h
              </span>
            </Button>

            {/* Headphone Ambient Audio Control */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleHeadphoneClick}
                  className={`h-8 w-8 rounded-full border transition-all shrink-0 ${
                    soundscapeEnabled
                      ? "bg-[#E5B95C] text-[#082428] border-[#E5B95C] shadow-sm animate-pulse"
                      : "bg-[#0D4347]/60 text-[#F7F5F0] border-[#4BA09F]/30 hover:bg-[#0D4347]"
                  }`}
                  aria-label={soundscapeEnabled ? "Ambient sound playing" : "Ambient sound muted"}
                  title={soundscapeEnabled ? "Playing soundscape (tap to mute)" : "Soundscape muted (tap to play)"}
                >
                  {soundscapeEnabled ? (
                    <Headphones className="h-4 w-4" />
                  ) : (
                    <HeadphoneOff className="h-4 w-4 opacity-70" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-4 bg-[#082428] border border-[#0D4347] text-[#F7F5F0] shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#0D4347]">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-[#E5B95C]" />
                    <span className="font-semibold text-xs text-[#F7F5F0]">Ambient Soundscapes</span>
                  </div>
                  <Button
                    size="sm"
                    variant={soundscapeEnabled ? "default" : "outline"}
                    className="h-6 px-2 text-[11px] bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90"
                    onClick={toggleSoundscape}
                  >
                    {soundscapeEnabled ? "Playing" : "Muted"}
                  </Button>
                </div>

                {/* Track Selector (8 Looping Tracks) */}
                <div className="mt-3 space-y-1.5">
                  <Label className="text-[11px] text-[#F7F5F0]/70 uppercase tracking-wider font-semibold">
                    Looping Soundscape
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {SOUNDSCAPES.map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          setActiveSoundscape(sc.id);
                          if (!soundscapeEnabled) setSoundscapeEnabled(true);
                        }}
                        className={`flex items-center gap-1.5 rounded-md p-1.5 text-left text-xs transition-colors ${
                          activeSoundscape === sc.id
                            ? "bg-[#E5B95C]/20 text-[#E5B95C] font-semibold border border-[#E5B95C]/40"
                            : "bg-[#0D4347]/40 text-[#F7F5F0]/80 hover:bg-[#0D4347]"
                        }`}
                      >
                        <span className="text-sm">{getSoundscapeEmoji(sc.id)}</span>
                        <span className="truncate">{sc.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#F7F5F0]/70">
                    <span className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3" /> Volume
                    </span>
                    <span>{Math.round(soundVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[soundVolume]}
                    onValueChange={handleVolumeChange}
                    min={0}
                    max={1}
                    step={0.05}
                    className="py-1"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      {/* ================= DASHBOARD DRAWER (SLIDE-OUT MENU) ================= */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 sm:w-96 bg-[#082428] border-r border-[#0D4347] text-[#F7F5F0] p-6 overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-[#0D4347]">
            <div className="flex items-center gap-2 mb-1">
              <img
                src="/elixir-header-latest.webp"
                alt="Elixir"
                className="h-5 w-auto object-contain brightness-0 invert"
              />
              <SheetTitle className="text-[#E5B95C] font-display text-xl font-bold">
                Sanctuary Dashboard
              </SheetTitle>
            </div>
            <p className="text-xs text-[#F7F5F0]/70">
              Navigate your study spaces, alchemy rack, and peer circles.
            </p>
          </SheetHeader>

          {/* Navigation Grid with Large Icons & Titles Below */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {[
              { id: "focus", label: "Focus Timer", icon: Timer, color: "text-[#4BA09F] bg-[#4BA09F]/10 border-[#4BA09F]/30" },
              { id: "apothecary", label: "Apothecary", icon: FlaskConical, color: "text-[#E5B95C] bg-[#E5B95C]/10 border-[#E5B95C]/30" },
              { id: "analytics", label: "Analytics", icon: BarChart2, color: "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30" },
              { id: "leaderboards", label: "Ranks", icon: Trophy, color: "text-[#E5B95C] bg-[#E5B95C]/10 border-[#E5B95C]/30" },
              { id: "buddies", label: "Study Buddies", icon: Users, color: "text-[#4BA09F] bg-[#4BA09F]/10 border-[#4BA09F]/30" },
              { id: "groups", label: "Study Groups", icon: Compass, color: "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30" },
              { id: "todos", label: "To-Do List", icon: ListTodo, color: "text-[#E5B95C] bg-[#E5B95C]/10 border-[#E5B95C]/30" },
              { id: "soundscapes", label: "Soundscapes", icon: Headphones, color: "text-[#4BA09F] bg-[#4BA09F]/10 border-[#4BA09F]/30" },
              { id: "share", label: "Share Progress", icon: Share2, color: "text-[#E5B95C] bg-[#E5B95C]/10 border-[#E5B95C]/30" },
              { id: "settings", label: "Settings", icon: Settings, color: "text-[#F4F1EA] bg-[#F4F1EA]/10 border-[#F4F1EA]/30" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "share") {
                      setDrawerOpen(false);
                      setShareModalOpen(true);
                      return;
                    }
                    if (item.id === "settings") {
                      setDrawerOpen(false);
                      setSettingsModalOpen(true);
                      return;
                    }
                    setActiveSection(item.id as LibrarySection);
                    setDrawerOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all text-center ${
                    isActive
                      ? "bg-[#0D4347] border-[#E5B95C] text-[#E5B95C] shadow-md ring-1 ring-[#E5B95C]"
                      : "bg-[#0D4347]/40 border-[#0D4347] hover:bg-[#0D4347]/80 text-[#F7F5F0]"
                  }`}
                >
                  <div className={`p-2.5 sm:p-3 rounded-full border mb-1.5 ${item.color}`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ================= MAIN CONTENT VIEWPORT ================= */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {activeSection === "focus" && (
          <div className="space-y-8 flex flex-col items-center">
            {/* Sanctuary Circular Ring & Alembic */}
            <div className="relative flex flex-col items-center justify-center">
              {/* Circular Draggable Ring SVG */}
              <div
                className="relative select-none touch-none cursor-pointer"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                <svg
                  ref={ringRef}
                  width="300"
                  height="300"
                  viewBox="0 0 300 300"
                  className="overflow-visible drop-shadow-2xl"
                >
                  <defs>
                    {/* Ring active gradient */}
                    <linearGradient id="sanctuaryRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4BA09F" />
                      <stop offset="100%" stopColor="#E5B95C" />
                    </linearGradient>
                  </defs>

                  {/* Inner ring backdrop: Warm paper `#F4F1EA` in light mode / dark slate-teal `#0F353A` in dark */}
                  <circle
                    cx="150"
                    cy="150"
                    r={ringRadius - 8}
                    className="fill-[#F4F1EA] dark:fill-[#0F353A] transition-colors shadow-inner"
                  />

                  {/* Muted teal ring track `#0D4347` */}
                  <circle
                    cx="150"
                    cy="150"
                    r={ringRadius}
                    stroke="#0D4347"
                    strokeWidth="12"
                    fill="none"
                  />

                  {/* Active Arc (Teal-to-gold `#4BA09F` / `#E5B95C`) */}
                  <circle
                    cx="150"
                    cy="150"
                    r={ringRadius}
                    stroke="url(#sanctuaryRingGrad)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 150 150)"
                    className="transition-all duration-300"
                  />

                  {/* Draggable Knob (only shown when not running) */}
                  {!timerState.isRunning && (
                    <g transform={`translate(${handleX}, ${handleY})`}>
                      <circle
                        r="14"
                        fill="#E5B95C"
                        stroke="#082428"
                        strokeWidth="3"
                        className="shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                      />
                      <circle r="4" fill="#082428" />
                    </g>
                  )}
                </svg>

                {/* Apothecary Alembic Distilling Inside Center of the Ring */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <ApothecaryFlask
                    fillPercent={timerState.isRunning ? (timerState.elapsedSeconds / timerState.targetSeconds) * 100 : goalProgressPercent}
                    durationMinutes={ringMinutes}
                    status={timerState.isRunning ? "running" : "completed"}
                    size={110}
                    showLabels={false}
                    showGlow={timerState.isRunning}
                  />

                  {/* Timer Display Under Alembic */}
                  <div className="mt-1 text-center">
                    <p className="font-mono text-2xl font-bold tracking-tight text-[#082428] dark:text-[#F1FBFD]">
                      {timerState.isRunning
                        ? formatFocusDuration(timerDisplaySeconds)
                        : `${ringMinutes}m Focus`}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#082428]/70 dark:text-[#F1FBFD]/70 truncate max-w-[130px]">
                      {timerState.isRunning
                        ? subjectLabel(timerState.subject)
                        : `Goal: ${goalProgressPercent}% done`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Presets (15, 25, 45, 60, 90) */}
              {!timerState.isRunning && (
                <div className="flex gap-2 mt-4">
                  {[15, 25, 45, 60, 90].map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRingMinutes(m);
                        setTargetMinutes(m);
                      }}
                      className={`h-7 px-2.5 text-xs rounded-full border ${
                        ringMinutes === m
                          ? "bg-[#E5B95C] text-[#082428] font-bold border-[#E5B95C]"
                          : "bg-[#0D4347]/50 text-[#F7F5F0] border-[#4BA09F]/20 hover:bg-[#0D4347]"
                      }`}
                    >
                      {m}m
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Active Session Action Controls */}
            <div className="w-full max-w-md space-y-4">
              {!timerState.isRunning && !timerState.isPaused ? (
                /* Idle State: Start Session Button */
                <Button
                  onClick={() => setSetupModalOpen(true)}
                  className="w-full h-12 text-base font-bold bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90 shadow-xl rounded-xl gap-2 transition-transform active:scale-98"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Start {ringMinutes}-Min Focus Session
                </Button>
              ) : isWithinGracePeriod ? (
                /* 10-Second Grace Period: Clean Cancel */
                <div className="space-y-2 rounded-xl bg-[#0D4347]/60 border border-[#4BA09F]/40 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#E5B95C]">
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>Grace Period Active ({graceSecondsRemaining}s)</span>
                  </div>
                  <p className="text-xs text-[#F7F5F0]/80">
                    Cancel cleanly without cracking your flask or recording an abandonment.
                  </p>
                  <Button
                    variant="outline"
                    onClick={cancelGracefully}
                    className="w-full h-9 text-xs border-[#E5B95C] text-[#E5B95C] hover:bg-[#E5B95C]/20"
                  >
                    Cancel ({graceSecondsRemaining}s)
                  </Button>
                </div>
              ) : (
                /* Active / Paused State: Pause & Give Up Only */
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {timerState.isPaused ? (
                      <Button
                        onClick={resumeTimer}
                        className="flex-1 h-11 text-sm font-semibold bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90 rounded-xl gap-2"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Resume Focus ({Math.floor(pauseSecondsLeft / 60)}:{(pauseSecondsLeft % 60).toString().padStart(2, "0")} left)
                      </Button>
                    ) : (
                      <Button
                        onClick={pauseTimer}
                        className="flex-1 h-11 text-sm font-semibold bg-[#0D4347] text-[#F7F5F0] hover:bg-[#0D4347]/80 border border-[#4BA09F]/30 rounded-xl gap-2"
                      >
                        <Pause className="h-4 w-4" /> Pause (5m max)
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("Give up now? Your apothecary flask will crack.")) {
                          void giveUpSession();
                        }
                      }}
                      className="h-11 px-4 text-xs rounded-xl gap-1.5"
                    >
                      <AlertTriangle className="h-4 w-4" /> Give Up
                    </Button>
                  </div>

                  {timerState.isPaused && (
                    <p className="text-center text-[11px] text-[#F7F5F0]/70">
                      Pause is capped at 5 minutes to keep you accountable.
                    </p>
                  )}
                </div>
              )}

              {/* Session Intent / Title Display */}
              {timerState.isRunning && (
                <div className="rounded-xl bg-[#0D4347]/40 border border-[#0D4347] p-3 text-center text-xs">
                  <p className="font-semibold text-[#E5B95C]">
                    {subjectLabel(timerState.subject)}
                    {timerState.sessionTitle ? ` • ${timerState.sessionTitle}` : ""}
                  </p>
                  {timerState.intentNote && (
                    <p className="text-[#F7F5F0]/80 mt-0.5">"{timerState.intentNote}"</p>
                  )}
                </div>
              )}

              {/* Compact Daily To-Do Section Below Timer */}
              <div className="rounded-2xl border border-[#0D4347] bg-[#082428]/60 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#0D4347] pb-2">
                  <h4 className="font-semibold text-xs text-[#F7F5F0] flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4 text-[#E5B95C]" /> Today's Study Tasks
                  </h4>
                  <span className="text-[10px] text-[#F7F5F0]/60">
                    {todos.filter((t) => t.completed).length} / {todos.length} done
                  </span>
                </div>

                {/* Add task input */}
                <form onSubmit={handleAddTodo} className="flex gap-2">
                  <Input
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    placeholder="Add task (e.g. Revise General Pathology PYQs)..."
                    className="h-8 text-xs bg-[#0D4347]/40 border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newTodoText.trim()}
                    className="h-8 px-2.5 bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </form>

                {/* List items */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {todos.length === 0 ? (
                    <p className="py-3 text-center text-[11px] text-[#F7F5F0]/50">
                      No tasks yet. Set goals to guide your study sessions.
                    </p>
                  ) : (
                    todos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[#0D4347]/30 p-2 text-xs hover:bg-[#0D4347]/50 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTodo(todo.id, !todo.completed)}
                          className="flex items-center gap-2 text-left min-w-0 flex-1"
                        >
                          {todo.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-[#F7F5F0]/40 shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              todo.completed
                                ? "line-through text-[#F7F5F0]/50"
                                : "text-[#F7F5F0]"
                            }`}
                          >
                            {todo.task}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="text-[#F7F5F0]/40 hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 2: APOTHECARY RACK ================= */}
        {activeSection === "apothecary" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#0D4347] pb-3">
              <div>
                <h3 className="font-display font-bold text-xl text-[#E5B95C]">The Apothecary Rack</h3>
                <p className="text-xs text-[#F7F5F0]/70">
                  Your focus sessions distilled into sealed elixir vials and cracked artifacts.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection("focus")}
                className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm"
              >
                Back to Timer
              </Button>
            </div>
            <ApothecaryRack sessions={sessions} />
          </div>
        )}

        {/* ================= SECTION 3: ANALYTICS ================= */}
        {activeSection === "analytics" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#0D4347] pb-3">
              <div>
                <h3 className="font-display font-bold text-xl text-[#38BDF8]">Focus Analytics</h3>
                <p className="text-xs text-[#F7F5F0]/70">
                  24-hour study timeline (IST) and subject-wise distillation charts.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection("focus")}
                className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm"
              >
                Back to Timer
              </Button>
            </div>
            <StudyAnalyticsTimeline sessions={sessions} />
          </div>
        )}

        {/* ================= SECTION 4: LEADERBOARDS ================= */}
        {activeSection === "leaderboards" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#0D4347] pb-3">
              <div>
                <h3 className="font-display font-bold text-xl text-[#E5B95C]">Study Leaderboards</h3>
                <p className="text-xs text-[#F7F5F0]/70">
                  Daily and weekly rankings resetting at midnight IST.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection("focus")}
                className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm"
              >
                Back to Timer
              </Button>
            </div>
            <LibraryLeaderboards currentUserId={user?.id ?? ""} currentUserProfile={profile} />
          </div>
        )}

        {/* ================= SECTION 5: STUDY BUDDIES ================= */}
        {activeSection === "buddies" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#0D4347] pb-3">
              <div>
                <h3 className="font-display font-bold text-xl text-[#E5B95C]">Study Buddies</h3>
                <p className="text-xs text-[#F7F5F0]/70">
                  Connect with batchmates, track live presence, and send silent cheers.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection("focus")}
                className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm"
              >
                Back to Timer
              </Button>
            </div>
            <StudyBuddiesTab currentUserId={user?.id ?? ""} profile={profile} />
          </div>
        )}

        {/* ================= SECTION 6: STUDY GROUPS ================= */}
        {activeSection === "groups" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#0D4347] pb-3">
              <div>
                <h3 className="font-display font-bold text-xl text-[#E5B95C]">Study Groups</h3>
                <p className="text-xs text-[#F7F5F0]/70">
                  Shared group distillations, live member presence, and ephemeral chat.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection("focus")}
                className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm"
              >
                Back to Timer
              </Button>
            </div>
            <StudyGroupsTab currentUserId={user?.id ?? ""} />
          </div>
        )}

        {/* ================= SECTION 7: FULL TO-DO LIST ================= */}
        {activeSection === "todos" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#0D4347] pb-3">
              <div>
                <h3 className="font-display font-bold text-xl text-[#E5B95C]">Personal Study Tasks</h3>
                <p className="text-xs text-[#F7F5F0]/70">
                  Daily checklist of Q-bank decks, PYQs, and medical revision topics.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection("focus")}
                className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm"
              >
                Back to Timer
              </Button>
            </div>

            <div className="rounded-2xl border border-[#0D4347] bg-[#082428] p-5 space-y-4">
              <form onSubmit={handleAddTodo} className="flex gap-2">
                <Input
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder="What will you conquer today? (e.g. 100 Surgery PYQs)..."
                  className="h-10 text-xs bg-[#0D4347]/40 border-[#0D4347] text-[#F7F5F0]"
                />
                <Button
                  type="submit"
                  disabled={!newTodoText.trim()}
                  className="h-10 px-4 bg-[#E5B95C] text-[#082428] font-semibold hover:bg-[#E5B95C]/90"
                >
                  Add Task
                </Button>
              </form>

              <div className="divide-y divide-[#0D4347]">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between gap-3 py-3 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(todo.id, !todo.completed)}
                      className="flex items-center gap-3 text-left flex-1"
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-[#10B981] shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-[#F7F5F0]/40 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          todo.completed
                            ? "line-through text-[#F7F5F0]/50"
                            : "text-[#F7F5F0] font-medium"
                        }`}
                      >
                        {todo.task}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-[#F7F5F0]/40 hover:text-red-400 p-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 8: SOUNDSCAPES GALLERY ================= */}
        {activeSection === "soundscapes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#0D4347] pb-3">
              <div>
                <h3 className="font-display font-bold text-xl text-[#E5B95C]">Looping Soundscapes</h3>
                <p className="text-xs text-[#F7F5F0]/70">
                  Continuous, infinite loop audio for immersion while studying.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSection("focus")}
                className="h-8 text-xs font-semibold text-[#0D4347] border-[#0D4347]/20 bg-[#F4F1EA] hover:bg-[#E8E2D5] shadow-sm"
              >
                Back to Timer
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {SOUNDSCAPES.map((sc) => {
                const isSelected = activeSoundscape === sc.id && soundscapeEnabled;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setActiveSoundscape(sc.id);
                      setSoundscapeEnabled(true);
                      toast.success(`Playing ${sc.label} (looping)`);
                    }}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all text-center ${
                      isSelected
                        ? "bg-[#0D4347] border-[#E5B95C] text-[#E5B95C] ring-2 ring-[#E5B95C] shadow-lg"
                        : "bg-[#082428] border-[#0D4347] hover:bg-[#0D4347]/50 text-[#F7F5F0]"
                    }`}
                  >
                    <span className="text-4xl mb-3">{getSoundscapeEmoji(sc.id)}</span>
                    <h4 className="font-semibold text-sm">{sc.label}</h4>
                    <p className="text-[11px] text-[#F7F5F0]/60 mt-1">{sc.description}</p>
                    <span className="mt-3 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#0D4347]/80 text-[#E5B95C]">
                      {isSelected ? "Now Playing" : "Tap to Play"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: POST-TIME SETUP FLOW ================= */}
      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="max-w-md bg-[#082428] border border-[#0D4347] text-[#F7F5F0] p-6 shadow-2xl">
          <DialogHeader className="text-left pb-3 border-b border-[#0D4347]">
            <DialogTitle className="text-[#E5B95C] font-display text-lg flex items-center gap-2">
              <FlaskConical className="h-5 w-5" /> Setup {ringMinutes}-Min Focus Session
            </DialogTitle>
            <p className="text-xs text-[#F7F5F0]/70">
              Set your subject and session intent before starting distillation.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-[#F7F5F0]">Medical Subject (19 Subjects)</Label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#0D4347] bg-[#0D4347]/60 px-3 py-2 text-xs font-medium text-[#F7F5F0] focus:outline-none focus:ring-2 focus:ring-[#E5B95C]"
              >
                {SUBJECT_ORDER.map((subj) => (
                  <option key={subj} value={subj} className="bg-[#082428] text-[#F7F5F0]">
                    {subjectLabel(subj)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#F7F5F0]">Session Title (Optional)</Label>
              <Input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Neoplasia Revision or 50 PYQs"
                className="mt-1 h-9 text-xs bg-[#0D4347]/60 border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40"
                maxLength={60}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#F7F5F0]">Session Goal Note (Optional)</Label>
              <Input
                value={sessionGoal}
                onChange={(e) => setSessionGoal(e.target.value)}
                placeholder="e.g. Master staging & Robbins micro images"
                className="mt-1 h-9 text-xs bg-[#0D4347]/60 border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40"
                maxLength={100}
              />
            </div>

            <Button
              onClick={handleConfirmStart}
              className="w-full mt-3 h-11 text-sm font-bold bg-[#E5B95C] text-[#082428] hover:bg-[#E5B95C]/90 rounded-xl shadow-lg gap-2"
            >
              <Play className="h-4 w-4 fill-current" />
              Begin Distillation ({ringMinutes}m)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

            {/* ================= MODAL: SHARE TODAY'S PROGRESS ================= */}
      {user && (
        <ShareableStudyCardModal
          userName={profile?.full_name || user.email || "Doctor"}
          userHandle={profile?.handle ?? null}
          college={profile?.college ?? null}
          todaySeconds={todayTotalSeconds}
          completedVials={todayCompletedVials}
          mcqsSolvedToday={todayMCQQuery.data ?? 0}
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
        />
      )}

      {/* ================= MODAL: SANCTUARY SETTINGS ================= */}
      {user && (
        <StudyProfileSettingsDialog
          currentUserId={user.id}
          profile={profile}
          open={settingsModalOpen}
          onOpenChange={setSettingsModalOpen}
        />
      )}

      {/* ================= MODAL: EDIT TODAY'S FOCUS GOAL ================= */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="max-w-sm bg-[#082428] border border-[#0D4347] text-[#F7F5F0] p-6 shadow-2xl">
          <DialogHeader className="text-left pb-3 border-b border-[#0D4347]">
            <DialogTitle className="text-[#E5B95C] font-display text-lg flex items-center gap-2">
              <Target className="h-5 w-5" /> Today's Focus Target
            </DialogTitle>
            <p className="text-xs text-[#F7F5F0]/70">
              Set your daily focus goal in hours to track progress.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-[#F7F5F0]">Select Daily Goal (Hours)</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[2, 4, 6, 8].map((h) => (
                  <Button
                    key={h}
                    type="button"
                    variant={!customGoalInput && dailyGoalHours === h ? "default" : "outline"}
                    className={`h-9 text-xs rounded-lg ${
                      !customGoalInput && dailyGoalHours === h
                        ? "bg-[#E5B95C] text-[#082428] font-bold"
                        : "border-[#0D4347] text-[#F7F5F0] hover:bg-[#0D4347]"
                    }`}
                    onClick={() => {
                      setDailyGoalHours(h);
                      setCustomGoalInput("");
                    }}
                  >
                    {h}h
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#F7F5F0]">Or Enter Custom Target</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  placeholder="e.g. 5.5"
                  className="h-9 text-xs bg-[#0D4347]/60 border-[#0D4347] text-[#F7F5F0]"
                />
                <span className="text-xs text-[#F7F5F0]/70">hours</span>
              </div>
            </div>

            <Button
              onClick={handleSaveGoal}
              className="w-full mt-2 bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90"
            >
              Save Focus Target
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
