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
      { title: "MedQuiz by Nirmaya — Medical MCQ Practice" },
      { name: "description", content: "Practise thousands of medical MCQs by subject and chapter, with timers, bookmarks and explanations." },
      { property: "og:title", content: "MedQuiz by Nirmaya — Medical MCQ Practice" },
      { property: "og:description", content: "Practise thousands of medical MCQs by subject and chapter, with timers, bookmarks and explanations." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const decks = useQuery({ queryKey: ["decks"], queryFn: fetchDecks });
  const stats = useQuery({ queryKey: ["stats", user?.id], queryFn: fetchStats, enabled: !!user });
  const [pick, setPick] = useState<Pick | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [quiz, setQuiz] = useState<{ qs: Question[]; timer: number; marks: Set<number> } | null>(null);
  const [savedTimer, setSavedTimer] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem("qb_timer") ?? 0) || 0;
  });

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

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={() => setQuiz(null)} className="text-left">
            <span className="font-display text-2xl text-primary">Nirmaya Care</span>
            <span className="ml-2 text-sm font-medium uppercase tracking-widest text-accent">Q-Banks</span>
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign in</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {quiz ? (
          <Quiz
            questions={quiz.qs}
            timer={quiz.timer}
            userId={user?.id ?? null}
            bookmarks={quiz.marks}
            onExit={() => {
              setQuiz(null);
              void stats.refetch();
            }}
          />
        ) : (
          <>
            {!user && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary px-5 py-3 text-sm text-primary">
                <span>Sign in to save your score and bookmark questions.</span>
                <Link to="/auth" className="font-semibold underline underline-offset-4">Sign in</Link>
              </div>
            )}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-4xl text-primary">Choose a subject</h1>
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
