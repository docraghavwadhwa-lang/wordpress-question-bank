import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BookOpenCheck, Flame, LineChart } from "lucide-react";
import { SubjectGrid, type Pick } from "@/components/qbank/SubjectGrid";
import { QuizSettings } from "@/components/qbank/QuizSettings";
import { Quiz } from "@/components/qbank/Quiz";
import { AppHeader } from "@/components/qbank/AppHeader";
import { Celebration } from "@/components/qbank/Celebration";
import { useAuth } from "@/hooks/use-auth";
import { useStreak } from "@/hooks/use-streak";
import { tierFor } from "@/lib/streak";

function Landing() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">15,000+ medical MCQs</p>
        <h1 className="text-5xl leading-tight text-primary sm:text-6xl">Practise daily. <em>Become</em> a great doctor.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Every subject and chapter, with explanations, timers, bookmarks, daily streaks and subject-wise progress.</p>
        <Link to="/auth" className="mt-8 inline-flex h-12 items-center rounded-md bg-primary px-8 font-medium text-primary-foreground hover:bg-primary/90">Sign in to start</Link>
        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {[
            { icon: BookOpenCheck, t: "18 subjects", d: "Chapter-wise question banks from Anatomy to Surgery." },
            { icon: Flame, t: "Daily streaks", d: "Pick Achiever, Scholar or Topper and stay consistent." },
            { icon: LineChart, t: "Your progress", d: "See how much of each subject you've completed." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border bg-card p-5">
              <f.icon className="h-6 w-6 text-accent" strokeWidth={1.6} />
              <h3 className="mt-3 font-display text-xl text-primary">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
import {
  fetchBookmarkIds,
  fetchBookmarkedQuestions,
  fetchDeckQuestions,
  fetchDecks,
  fetchStats,
  shuffle,
  type Question,
} from "@/lib/qbank";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedQuiz by Nirmaya Care — Medical MCQ Practice" },
      { name: "description", content: "Practise thousands of medical MCQs by subject and chapter, with timers, bookmarks and explanations." },
      { property: "og:title", content: "MedQuiz by Nirmaya Care — Medical MCQ Practice" },
      { property: "og:description", content: "Practise thousands of medical MCQs by subject and chapter, with timers, bookmarks and explanations." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, ready } = useAuth();
  const decks = useQuery({ queryKey: ["decks"], queryFn: fetchDecks, enabled: !!user });
  const stats = useQuery({ queryKey: ["stats", user?.id], queryFn: fetchStats, enabled: !!user });
  const streak = useStreak(user?.id);
  const [pick, setPick] = useState<Pick | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [quiz, setQuiz] = useState<{ qs: Question[]; timer: number; marks: Set<number> } | null>(null);
  const [savedTimer, setSavedTimer] = useState(0);
  useEffect(() => {
    setSavedTimer(Number(localStorage.getItem("qb_timer") ?? 0) || 0);
  }, []);

  async function start(timer: number) {
    if (!pick) return;
    setLoading(true);
    try {
      const qs = pick.bookmarks ? await fetchBookmarkedQuestions() : await fetchDeckQuestions(pick.path!);
      if (!qs.length) {
        setMessage(pick.bookmarks ? "You have no bookmarked questions yet." : "No questions found.");
        return;
      }
      const marks = user ? await fetchBookmarkIds() : new Set<number>();
      localStorage.setItem("qb_timer", String(timer));
      setSavedTimer(timer);
      setQuiz({ qs: shuffle(qs), timer, marks });
      setPick(null);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <div className="min-h-screen" />;
  if (!user) return <Landing />;

  const tier = tierFor(streak.goal);
  return (
    <div className="min-h-screen">
      <AppHeader onHome={() => setQuiz(null)} />
      <Celebration days={streak.celebrate} stats={streak.celebrationStats} onClose={streak.closeCelebration} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {quiz ? (
          <Quiz
            questions={quiz.qs}
            timer={quiz.timer}
            userId={user.id}
            bookmarks={quiz.marks}
            onAnswered={() => void streak.refresh()}
            onExit={() => {
              setQuiz(null);
              void stats.refetch();
            }}
          />
        ) : (
          <>
            <Link to="/stats" className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 transition-colors hover:border-accent/60">
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
            </Link>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b pb-8">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">The question bank</p>
                <h1 className="text-5xl leading-none text-primary sm:text-6xl">Choose a <em>subject</em></h1>
              </div>
              {stats.data && stats.data.attempts > 0 && (
                <p className="text-sm text-muted-foreground">
                  Your record: {stats.data.correct}/{stats.data.attempts} correct ({Math.round((100 * stats.data.correct) / stats.data.attempts)}%)
                </p>
              )}
            </div>
            {decks.isLoading && <p className="text-muted-foreground">Loading subjects…</p>}
            {decks.error && <p className="text-destructive">Couldn't load subjects. Please refresh.</p>}
            {decks.data && <SubjectGrid decks={decks.data} signedIn={!!user} onPick={(p) => { setMessage(undefined); setPick(p); }} />}
          </>
        )}
      </main>

      <QuizSettings
        key={pick?.title ?? "none"}
        pick={pick}
        initialTimer={savedTimer}
        loading={loading}
        message={message}
        onCancel={() => setPick(null)}
        onStart={start}
      />
    </div>
  );
}
