import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Bookmark, CircleAlert, History, Clock, Flame, PlayCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BlitzCard, BlitzRankLine } from "@/components/qbank/Blitz";
import { BLITZ_TIMER, fetchBlitz, saveBlitz } from "@/lib/blitz";
import { todayKey } from "@/lib/daily";
import { SubjectGrid, type Pick } from "@/components/qbank/SubjectGrid";
import { QuizSettings } from "@/components/qbank/QuizSettings";
import { Quiz } from "@/components/qbank/Quiz";
import { AppHeader } from "@/components/qbank/AppHeader";
import { Celebration } from "@/components/qbank/Celebration";
import { useAuth } from "@/hooks/use-auth";
import { useStreak } from "@/hooks/use-streak";
import { tierFor } from "@/lib/streak";
import { QuestionOfTheDay, QuoteOfTheDay } from "@/components/qbank/Daily";
import { PushToggle } from "@/components/qbank/PushToggle";
import { OfflineDownload } from "@/components/qbank/OfflineDownload";
import { Bookmarks } from "@/components/qbank/Bookmarks";
import { fetchQuizReviews, latestReviews, REVIEW_WINDOW_MS, saveQuizReview, type QuizReview } from "@/lib/quiz-reviews";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/native-auth";
import { offlineErrorMessage } from "@/lib/offline-data";
import { GoogleSignInButton } from "@/components/qbank/GoogleSignInButton";
import { fetchAccess, fetchPlanSubjects, lockedSubjects } from "@/lib/subscriptions";
import { Feature, useFeatures } from "@/components/qbank/FeatureGate";
import { OpeningScreen } from "@/components/qbank/OpeningScreen";
import { TrialCountdown } from "@/components/qbank/TrialRequest";

function Landing() {
  return (
    <main data-sign-in-landing className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand px-6 py-16 text-center text-brand-foreground">
      <img src="/elixir-landing-logo.webp" alt="Elixir by Nirmaya Care" width={801} height={738} className="h-auto w-56 max-w-[70vw] sm:w-72" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-brand-foreground/75">16,000+ MCQs · 19 subjects</p>
      <GoogleSignInButton className="mt-[118px] rounded-full px-8 shadow-lg" />
    </main>
  );
}
import {
  fetchBookmarkIds,
  fetchDeckQuestions,
  fetchDecks,
  fetchMarked,
  fetchQuestionsByIds,
  fetchStats,
  loadSession,
  saveSession,
  shuffle,
  type Question,
  type SavedSession,
} from "@/lib/qbank";
import type { QuizProgress } from "@/components/qbank/Quiz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elixir" },
      { name: "description", content: "Practise thousands of medical MCQs by subject and chapter, with timers, bookmarks and explanations." },
      { property: "og:title", content: "Elixir by Nirmaya Care — Medical MCQ Practice" },
      { property: "og:description", content: "Practise thousands of medical MCQs by subject and chapter, with timers, bookmarks and explanations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type ActiveQuiz = { qs: Question[]; timer: number; marks: Set<number>; title: string; quizKey: string; mode: "practice" | "blitz" | "review"; initial?: QuizProgress | undefined; reviewChoices?: Record<string, string | null> | undefined; test?: boolean };

function Index() {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const features = useFeatures();
  const decks = useQuery({ queryKey: ["decks"], queryFn: fetchDecks, enabled: !!user });
  const stats = useQuery({ queryKey: ["stats", user?.id], queryFn: fetchStats, enabled: !!user });
  const marked = useQuery({ queryKey: ["marked", user?.id], queryFn: fetchMarked, enabled: !!user });
  const reviews = useQuery({ queryKey: ["quiz-reviews", user?.id], queryFn: () => user ? fetchQuizReviews(user.id) : Promise.resolve([]), enabled: !!user });
  const access = useQuery({ queryKey: ["access", user?.id], queryFn: fetchAccess, enabled: !!user });
  const planSubjects = useQuery({ queryKey: ["plan-subjects"], queryFn: fetchPlanSubjects, enabled: !!user });
  const streak = useStreak(user?.id);
  const [pick, setPick] = useState<Pick | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [quiz, setQuiz] = useState<ActiveQuiz | null>(null);
  const [savedTimer, setSavedTimer] = useState(0);
  const [paused, setPaused] = useState<SavedSession | null>(null);
  const [studyTool, setStudyTool] = useState<"bookmarks" | "mistakes" | null>(null);
  const [now, setNow] = useState(() => new Date());
  const day = todayKey(now);
  const qbanks = useLocation().hash === "qbanks";
  const [isApp, setIsApp] = useState(false);
  useEffect(() => setIsApp(isNativeApp()), []);
  useEffect(() => {
    if (!ready || (user && decks.isPending)) return;
    (window as unknown as { ElixirLaunch?: { ready: () => void } }).ElixirLaunch?.ready();
  }, [ready, user, decks.isPending]);
  useEffect(() => {
    setSavedTimer(Number(localStorage.getItem("qb_timer") ?? 0) || 0);
    setPaused(loadSession());
    const tool = new URLSearchParams(window.location.search).get("tool");
    if (tool === "bookmarks" || tool === "mistakes") setStudyTool(tool);
    if (tool === "blitz") document.getElementById("daily-blitz")?.scrollIntoView();
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  function goHome() {
    setQuiz(null);
    setPaused(loadSession());
    void stats.refetch();
    void marked.refetch();
    void reviews.refetch();
  }

  async function launch(qs: Question[], timer: number, title: string, mode: ActiveQuiz["mode"], initial?: QuizProgress, quizKey = title, reviewChoices?: Record<string, string | null>, test = false) {
    const marks = user ? await fetchBookmarkIds(user.id) : new Set<number>();
    if (mode === "practice" && !test) {
      saveSession({ title, quizKey, ids: qs.map((q) => q.id), timer, index: initial?.index ?? 0, score: initial?.score ?? 0, answered: initial?.answered ?? 0, spent: initial?.spent ?? { total: 0, count: 0 }, choices: initial?.choices ?? {} });
    }
    setQuiz({ qs, timer, marks, title, mode, initial, quizKey, reviewChoices, test });
  }

  async function start(timer: number, review?: boolean, test = false) {
    if (!pick) return;
    if (!features.enabled("qbanks") || (pick.imagesOnly && !features.enabled("image_questions")) || (test && !features.enabled("test_mode")) || (pick.kind === "bookmarks" && !features.enabled("bookmarks")) || (pick.kind === "mistakes" && !features.enabled("mistake_vault"))) { setMessage("This feature is currently disabled."); return; }
    setLoading(true);
    try {
      const all = pick.ids ? await fetchQuestionsByIds(pick.ids) : pick.path ? await fetchDeckQuestions(pick.path) : [];
      const qs = pick.imagesOnly ? all.filter(q => /<img\b/i.test(q.stem)) : all;
      if (!qs.length && all.length) { setMessage("No image-based questions in this chapter yet."); return; }
      if (!qs.length) {
        setMessage("These questions are locked. Choose a Pro plan for access.");
        return;
      }
      localStorage.setItem("qb_timer", String(timer));
      setSavedTimer(timer);
      await launch(review ? qs : shuffle(qs), review ? 0 : timer, pick.title, review ? "review" : "practice", undefined, (pick.imagesOnly ? `images:${pick.path}` : pick.path) ?? `${pick.kind}:${pick.subtitle ?? pick.title}`, undefined, !review && test);
      setPick(null);
    } catch (error) {
      setMessage(offlineErrorMessage(error, "Couldn't open these questions. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function resume(restart: boolean) {
    if (!paused) return;
    if (!features.enabled("qbanks")) { toast.error("Q-Banks are currently disabled."); return; }
    setLoading(true);
    try {
      const qs = await fetchQuestionsByIds(paused.ids);
      if (restart) await launch(shuffle(qs), paused.timer, paused.title, "practice", undefined, paused.quizKey ?? paused.title);
      else await launch(qs, paused.timer, paused.title, "practice", paused, paused.quizKey ?? paused.title);
    } catch (error) {
      toast.error(offlineErrorMessage(error, "Couldn't resume these questions. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function startBlitz() {
    if (!features.enabled("daily_blitz")) return;
    setLoading(true);
    try {
      await launch(await fetchBlitz(day), BLITZ_TIMER, "Daily Blitz", "blitz");
    } catch (error) {
      toast.error(offlineErrorMessage(error, "Couldn't open Daily Blitz. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function openReview(row: QuizReview) {
    if (!features.enabled("reviews")) return;
    if (!user || !latestReviews([row], user.id).length) {
      toast.error("This review has expired.");
      void reviews.refetch();
      return;
    }
    setLoading(true);
    try {
      const qs = await fetchQuestionsByIds(row.question_ids);
      if (qs.length !== row.question_ids.length) throw new Error("Questions unavailable");
      await launch(qs, 0, row.title, "review", undefined, row.quiz_key, row.choices);
    } catch (error) { toast.error(offlineErrorMessage(error, "Couldn't open this review. Please try again.")); }
    finally { setLoading(false); }
  }

  if (!ready) return <OpeningScreen />;
  if (isApp && user && decks.isPending) return <OpeningScreen />;
  if (!user) return <Landing />;

  const tier = tierFor(streak.goal);
  const hoursLeft = Math.ceil((24 * 60 - (now.getHours() * 60 + now.getMinutes())) / 60);
  const needed = Math.max(0, streak.goal - streak.streak.today);
  const lateNight = now.getHours() >= 20 && streak.streak.current > 0 && !streak.streak.todayDone;
  const recent = features.enabled("reviews") ? latestReviews(reviews.data ?? [], user.id, Math.max(now.getTime(), Date.now()) + 300000) : [];
  const locked = access.data?.admin ? new Set<string>() : lockedSubjects(access.data?.subscriptions ?? [], planSubjects.data ?? [], (decks.data ?? []).filter(d => d.depth === 1).map(d => d.subject));
  for (const subject of access.data?.offlineSubjects ?? []) locked.delete(subject);
  return (
    <div className="min-h-screen">
      <AppHeader onHome={goHome} />
      <Celebration days={streak.celebrate} stats={streak.celebrationStats} onClose={streak.closeCelebration} />

      <main className={`mx-auto max-w-5xl px-4 ${isApp ? "py-5" : "py-8 sm:py-12"}`}>
        {!quiz && !qbanks && <TrialCountdown />}
        {quiz ? (
          <Quiz
            key={quiz.title + quiz.mode + (quiz.initial?.index ?? "new")}
            questions={quiz.qs}
            timer={quiz.timer}
            userId={user.id}
            bookmarks={quiz.marks}
            bookmarksEnabled={features.enabled("bookmarks")}
            mode={quiz.mode}
            test={!!quiz.test}
            goal={streak.goal}
            todayCount={streak.streak.today}
            initial={quiz.initial}
            reviewChoices={quiz.reviewChoices}
            onAnswered={() => void streak.refresh()}
            onProgress={(p) => {
              const cur = loadSession();
              if (quiz.mode === "practice" && !quiz.test && cur) saveSession({ ...cur, ...p });
            }}
            onFinish={(r) => {
              if (quiz.mode === "practice") saveSession(null);
              if (quiz.mode === "practice" && r.completed && features.enabled("reviews")) {
                const row: QuizReview = { id: crypto.randomUUID(), user_id: user.id, quiz_key: quiz.quizKey, title: quiz.title, question_ids: quiz.qs.map(q => q.id), choices: r.choices, score: r.score, answered: r.answered, completed_at: new Date().toISOString() };
                qc.setQueryData<QuizReview[]>(["quiz-reviews", user.id], old => [row, ...(old ?? [])]);
                void saveQuizReview(row).then(() => qc.invalidateQueries({ queryKey: ["quiz-reviews", user.id] })).catch(() => toast.error("Review saved on this device; online sync failed."));
              }
              if (quiz.mode === "blitz")
                void saveBlitz(user.id, day, r.score, r.seconds).then(() => qc.invalidateQueries({ queryKey: ["blitz-rank", day] }));
            }}
            finishedSlot={!features.enabled("reviews") && quiz.mode === "practice" ? undefined : quiz.mode === "blitz" ? <BlitzRankLine day={day} /> : quiz.mode === "practice" ? <section className="mt-6 border-t pt-5"><h3 className="font-display text-xl text-primary">Review attempts</h3><p className="mt-1 text-xs text-muted-foreground">Available for 72 hours after submission</p><div className="mt-3 divide-y">{recent.filter(row => row.quiz_key === quiz.quizKey).map(row => <div key={row.id} className="py-3 text-left"><p className="text-sm font-medium text-primary">{row.title}</p><p className="mt-1 text-xs text-muted-foreground">{row.score}/{row.answered} correct · {Math.max(1, Math.ceil((Date.parse(row.completed_at) + REVIEW_WINDOW_MS - now.getTime()) / 3600000))}h left</p><Button className="mt-2" variant="outline" disabled={loading} onClick={() => void openReview(row)}>Review attempt</Button></div>)}</div></section> : undefined}
            onExit={goHome}
          />
        ) : qbanks ? (
          <>
            <div className={isApp ? "mb-5" : "mb-10 flex flex-wrap items-end justify-between gap-4 border-b pb-8"}>
              <div>
                {!isApp && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">The question bank</p>}
                <h1 className={isApp ? "text-3xl text-primary" : "text-5xl leading-none text-primary sm:text-6xl"}>{isApp ? "Q-Banks" : <>Choose a <em>subject</em></>}</h1>
              </div>
            </div>
            {decks.isLoading && <p className="text-muted-foreground">Loading subjects…</p>}
            {decks.error && <p className="text-destructive">{offlineErrorMessage(decks.error, "Couldn't load subjects. Please refresh.")}</p>}
            {decks.data && <SubjectGrid imagesEnabled={features.enabled("image_questions")} bookmarksEnabled={features.enabled("bookmarks")} mistakesEnabled={features.enabled("mistake_vault")} decks={decks.data} marked={marked.data} locked={locked} onPick={(p) => { setMessage(undefined); setPick(p); }} />}
          </>
        ) : (
          <>
            {lateNight && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/40 bg-danger-soft px-5 py-4">
                <Clock className="h-5 w-5 shrink-0 text-destructive" />
                <p className="font-medium text-foreground">
                  Your {streak.streak.current}-day streak expires in {hoursLeft} {hoursLeft === 1 ? "hour" : "hours"} — complete {needed} {needed === 1 ? "question" : "questions"} to save it
                </p>
              </div>
            )}
            <Feature name="progress"><Link to="/stats" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 transition-colors hover:border-accent/60">
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15"><Flame className="h-5 w-5 text-accent" /></span>
                <span>
                  <span className="block font-display text-xl text-primary">{streak.streak.current}-day streak</span>
                  <span className="text-sm text-muted-foreground">{tier.name} · today {Math.min(streak.streak.today, streak.goal)}/{streak.goal} questions</span>
                </span>
              </span>
              <span className="h-2 w-40 overflow-hidden rounded-full bg-secondary">
                <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (100 * streak.streak.today) / streak.goal)}%` }} />
              </span>
            </Link></Feature>
            <Feature name="daily_blitz"><div id="daily-blitz" className="mb-4">
              <BlitzCard day={day} loading={loading} onStart={() => void startBlitz()} />
            </div></Feature>
            {paused && features.enabled("qbanks") && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/50 bg-card px-5 py-4">
                <span className="flex items-center gap-3">
                  <PlayCircle className="h-6 w-6 text-accent" />
                  <span>
                    <span className="block font-display text-lg text-primary">Paused: {paused.title}</span>
                    <span className="text-sm text-muted-foreground">Question {paused.index + 1} of {paused.ids.length}</span>
                  </span>
                </span>
                <span className="flex gap-2">
                  <Button variant="ghost" className="text-destructive" disabled={loading} onClick={() => { saveSession(null); setPaused(null); }}>Delete</Button>
                  <Button variant="outline" disabled={loading} onClick={() => void resume(true)}>Restart</Button>
                  <Button disabled={loading} onClick={() => void resume(false)}>Continue</Button>
                </span>
              </div>
            )}
            <div className="mb-12">
              <div className={isApp ? "flex flex-col" : ""}>
              <Feature name="qotd"><QuestionOfTheDay /></Feature>
              {isApp && <Feature name="reminders"><div className="mt-3"><PushToggle /></div></Feature>}
              <div className={isApp ? "order-first mb-5" : "mt-4"}>
              {isApp && <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl text-primary">Revision tools</h2><Link to="/" hash="qbanks" onClick={goHome} className="text-xs font-semibold text-accent">All Q-Banks →</Link></div>}
              <div className={`grid gap-3 ${isApp ? "grid-cols-1" : "sm:grid-cols-2"}`} aria-label="Study tools">
                <Feature name="bookmarks"><Button variant="study" className="h-auto min-h-24 justify-start gap-3 whitespace-normal px-4 py-4 text-left" data-active={studyTool === "bookmarks"} onClick={() => setStudyTool(v => v === "bookmarks" ? null : "bookmarks")} aria-expanded={studyTool === "bookmarks"}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-accent"><Bookmark /></span>
                  <span className="min-w-0"><span className="block font-display text-lg text-primary">Bookmarks</span><span className="block text-xs font-normal text-muted-foreground">{marked.data?.bookmarks.length ?? 0} saved questions</span></span>
                </Button>
                {features.enabled("bookmarks") && studyTool === "bookmarks" && <div className="col-span-full -mt-1"><Bookmarks kind={studyTool} marked={marked.data?.[studyTool]} loading={marked.isLoading} error={!!marked.error} onPick={p => { setMessage(undefined); setPick(p); }} /></div>}
                </Feature><Feature name="mistake_vault"><Button variant="study" className="h-auto min-h-24 justify-start gap-3 whitespace-normal px-4 py-4 text-left" data-active={studyTool === "mistakes"} onClick={() => setStudyTool(v => v === "mistakes" ? null : "mistakes")} aria-expanded={studyTool === "mistakes"}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-destructive"><CircleAlert /></span>
                  <span className="min-w-0"><span className="block font-display text-lg text-primary">Mistake vault</span><span className="block text-xs font-normal text-muted-foreground">{marked.data?.mistakes.length ?? 0} to revisit</span></span>
                </Button>
                {features.enabled("mistake_vault") && studyTool === "mistakes" && <div className="col-span-full -mt-1"><Bookmarks kind={studyTool} marked={marked.data?.[studyTool]} loading={marked.isLoading} error={!!marked.error} onPick={p => { setMessage(undefined); setPick(p); }} /></div>}
              </Feature></div>
              </div>
              </div>
              <Feature name="offline_downloads"><OfflineDownload /></Feature>
            </div>
            <QuoteOfTheDay />
          </>
        )}
      </main>

      <QuizSettings
        key={pick?.title ?? "none"}
        allowTest={features.enabled("test_mode")}
        pick={pick}
        initialTimer={savedTimer}
        loading={loading}
        message={message}
        onCancel={() => setPick(null)}
        onStart={start}
        attempts={pick ? recent.filter(row => row.quiz_key === ((pick.imagesOnly ? `images:${pick.path}` : pick.path) ?? `${pick.kind}:${pick.subtitle ?? pick.title}`)).map(row => ({ id: row.id, label: `${new Date(row.completed_at).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${row.score}/${row.answered} correct` })) : []}
        onReview={id => { const row = recent.find(r => r.id === id); if (row) { setPick(null); void openReview(row); } }}
      />
    </div>
  );
}
