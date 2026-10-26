import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectGrid, type Pick } from "@/components/qbank/SubjectGrid";
import { QuizSettings } from "@/components/qbank/QuizSettings";
import { Quiz } from "@/components/qbank/Quiz";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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
