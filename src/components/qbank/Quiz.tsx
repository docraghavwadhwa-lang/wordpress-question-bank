import { useEffect, useRef, useState } from "react";
import { Bookmark, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAverage, recordAttempt, setBookmark, type Question } from "@/lib/qbank";
import { answerFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const LETTERS = "ABCDE";

export type QuizProgress = { index: number; score: number; answered: number; spent: { total: number; count: number }; choices?: Record<string, string | null> };

export function Quiz({
  questions,
  timer,
  userId,
  bookmarks,
  mode = "practice",
  goal,
  todayCount = 0,
  initial,
  onProgress,
  onFinish,
  onExit,
  onAnswered,
  finishedSlot,
  reviewChoices,
}: {
  questions: Question[];
  timer: number;
  userId: string | null;
  bookmarks: Set<number>;
  mode?: "practice" | "blitz" | "review";
  goal?: number;
  todayCount?: number;
  initial?: QuizProgress | undefined;
  onProgress?: (p: QuizProgress) => void;
  onFinish?: (r: { score: number; answered: number; seconds: number; choices: Record<string, string | null>; completed: boolean }) => void;
  onExit: () => void;
  onAnswered?: () => void;
  finishedSlot?: React.ReactNode;
  reviewChoices?: Record<string, string | null> | undefined;
}) {
  const review = mode === "review";
  const [i, setI] = useState(initial?.index ?? 0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [done, setDone] = useState(review);
  const [timedOut, setTimedOut] = useState(false);
  const [left, setLeft] = useState(timer);
  const [score, setScore] = useState(initial?.score ?? 0);
  const [answered, setAnswered] = useState(initial?.answered ?? 0);
  const [spent, setSpent] = useState(initial?.spent ?? { total: 0, count: 0 });
  const [choices, setChoices] = useState<Record<string, string | null>>(initial?.choices ?? {});
  const [marks, setMarks] = useState(bookmarks);
  const [finished, setFinished] = useState(false);
  const [today, setToday] = useState(todayCount);
  const [xp, setXp] = useState<number[]>([]);
  const t0 = useRef(Date.now());
  const q = questions[i] as Question;

  useEffect(() => {
    t0.current = Date.now();
    const saved = review ? reviewChoices : choices;
    setChosen(saved?.[q?.id] ?? null);
    setDone(review || Object.prototype.hasOwnProperty.call(saved ?? {}, q?.id));
    setTimedOut(false);
    setLeft(timer);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [i, timer, review]);

  useEffect(() => {
    if (!review) onProgress?.({ index: i, score, answered, spent, choices });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, score, answered, spent, choices]);

  useEffect(() => {
    if (!timer || done || finished || review) return;
    if (left <= 0) {
      setTimedOut(true);
      answer(null);
      return;
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, timer, done, finished]);

  function finish() {
    setFinished(true);
    onFinish?.({ score, answered, seconds: spent.total, choices, completed: i + 1 === questions.length && done });
  }

  function answer(letter: string | null) {
    if (done) return;
    setDone(true);
    setChosen(letter);
    setChoices(c => ({ ...c, [q.id]: letter }));
    let secs = (Date.now() - t0.current) / 1000;
    if (timer) secs = Math.min(secs, timer);
    setSpent((s) => ({ total: s.total + secs, count: s.count + 1 }));
    const correct = !!letter && letter === q.answer;
    if (q.answer && (letter || timer)) setAnswered((a) => a + 1);
    if (letter && q.answer) {
      answerFeedback(correct);
      setToday((t) => t + 1);
    }
    if (correct) {
      setScore((s) => s + 1);
      const k = Date.now();
      setXp((x) => [...x, k]);
      setTimeout(() => setXp((x) => x.filter((v) => v !== k)), 1100);
    }
    // Blitz answers are scored separately and never count towards streaks.
    if (mode !== "blitz" && userId && letter && q.answer) void recordAttempt(userId, q.id, letter, correct, secs).then(() => onAnswered?.());
  }

  function toggleMark() {
    if (!userId) return;
    const on = !marks.has(q.id);
    const next = new Set(marks);
    if (on) next.add(q.id);
    else next.delete(q.id);
    setMarks(next);
    void setBookmark(userId, q.id, on);
  }

  if (finished || !q) {
    const pct = answered ? Math.round((100 * score) / answered) : 0;
    return (
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h2 className="text-3xl text-primary">{review ? "Review complete" : mode === "blitz" ? "Blitz complete" : "Session complete"}</h2>
        {!review && (
          <>
            <p className="mt-6 text-5xl font-semibold text-primary">{pct}%</p>
            <p className="mt-2 text-lg">Score: {score} / {answered}</p>
            <p className="mt-1 text-muted-foreground">Average time per question: {formatAverage(spent.total, spent.count)}</p>
          </>
        )}
        {finishedSlot}
        <Button className="mt-8" onClick={onExit}>Back to subjects</Button>
      </div>
    );
  }

  const crumbs = q.deck_path.split(" > ").slice(1).join(" › ");
  const last = i + 1 === questions.length;

  return (
    <div className="relative mx-auto max-w-3xl rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute right-6 top-14 z-10">
        {xp.map((k) => (
          <span key={k} className="qb-xp absolute right-0 font-display text-xl font-semibold text-success">+10 XP</span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="font-semibold text-primary">
          {mode === "blitz" && "Daily Blitz · "}{review && "Reading · "}Question {i + 1} of {questions.length}
        </span>
        {timer > 0 && !review && (
          <span className={cn("inline-flex items-center gap-1 font-semibold", left <= 10 && "text-destructive")}>
            <Timer className="h-4 w-4" /> {left}s
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{crumbs}</span>
        {userId && (
          <button
            type="button"
            onClick={toggleMark}
            aria-pressed={marks.has(q.id)}
            title={marks.has(q.id) ? "Remove bookmark" : "Bookmark this question"}
            className="rounded-full p-2 text-accent hover:bg-muted"
          >
            <Bookmark className={cn("h-5 w-5", marks.has(q.id) && "fill-current")} />
          </button>
        )}
      </div>
      {timer > 0 && !review && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full bg-accent transition-all duration-1000 ease-linear", left <= 10 && "bg-destructive")}
            style={{ width: `${(100 * left) / timer}%` }}
          />
        </div>
      )}
      {goal && !review && mode !== "blitz" && (
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="shrink-0">Today {Math.min(today, goal)}/{goal}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <span className="block h-full rounded-full bg-success transition-all duration-300 ease-out" style={{ width: `${Math.min(100, (100 * today) / goal)}%` }} />
          </span>
        </div>
      )}

      <div className="qb-html mt-5 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: q.stem }} />

      <div className="mt-6 space-y-3">
        {q.options.length ? (
          q.options.map((o, k) => {
            const L = LETTERS[k] ?? String(k);
            const right = done && q.answer === L;
            const wrong = done && chosen === L && q.answer !== L;
            return (
              <button
                key={L}
                type="button"
                disabled={done}
                onClick={() => answer(L)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left leading-snug transition-colors",
                  !done && "hover:border-accent hover:bg-secondary",
                  right && "border-success bg-success-soft",
                  wrong && "border-destructive bg-danger-soft",
                )}
              >
                <span className="font-semibold text-primary">{L}.</span>
                <span className="qb-html min-w-0 flex-1 break-words" dangerouslySetInnerHTML={{ __html: o }} />
              </button>
            );
          })
        ) : (
          !done && <Button onClick={() => answer(null)}>Show answer</Button>
        )}
      </div>

      {done && (
        <div className="mt-6 space-y-3">
          {review && reviewChoices && <p className="text-sm font-medium text-primary">Your answer: {chosen ?? "Not answered"} · Correct answer: {q.answer ?? "Not set"}</p>}
          {timedOut && <p className="font-semibold text-destructive">Time's up!</p>}
          {!q.answer && (
            <p className="rounded-lg bg-muted px-4 py-2 text-sm">No answer key is set for this question. Read the explanation.</p>
          )}
          {q.explanation && (
            <div className="qb-html rounded-xl bg-secondary p-4 text-sm leading-relaxed sm:p-5" dangerouslySetInnerHTML={{ __html: q.explanation }} />
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="outline" onClick={finish}>End session</Button>
          {review && i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}>Previous</Button>}
        </div>
        <Button disabled={!done} onClick={() => (last ? finish() : setI(i + 1))}>{last ? "Finish" : "Next"}</Button>
      </div>
    </div>
  );
}
