import { useEffect, useRef, useState } from "react";
import { Bookmark, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAverage, recordAttempt, setBookmark, type Question } from "@/lib/qbank";
import { cn } from "@/lib/utils";

const LETTERS = "ABCDE";

export function Quiz({
  questions,
  timer,
  userId,
  bookmarks,
  onExit,
}: {
  questions: Question[];
  timer: number;
  userId: string | null;
  bookmarks: Set<number>;
  onExit: () => void;
}) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [left, setLeft] = useState(timer);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [spent, setSpent] = useState({ total: 0, count: 0 });
  const [marks, setMarks] = useState(bookmarks);
  const [finished, setFinished] = useState(false);
  const t0 = useRef(Date.now());
  const q = questions[i];

  useEffect(() => {
    t0.current = Date.now();
    setChosen(null);
    setDone(false);
    setTimedOut(false);
    setLeft(timer);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [i, timer]);

  useEffect(() => {
    if (!timer || done || finished) return;
    if (left <= 0) {
      setTimedOut(true);
      answer(null);
      return;
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, timer, done, finished]);

  function answer(letter: string | null) {
    if (done) return;
    setDone(true);
    setChosen(letter);
    let secs = (Date.now() - t0.current) / 1000;
    if (timer) secs = Math.min(secs, timer);
    setSpent((s) => ({ total: s.total + secs, count: s.count + 1 }));
    const correct = !!letter && letter === q.answer;
    if (q.answer && (letter || timer)) setAnswered((a) => a + 1);
    if (correct) setScore((s) => s + 1);
    if (userId && letter && q.answer) void recordAttempt(userId, q.id, letter, correct, secs);
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
        <h2 className="text-3xl text-primary">Session complete</h2>
        <p className="mt-6 text-5xl font-semibold text-primary">{pct}%</p>
        <p className="mt-2 text-lg">Score: {score} / {answered}</p>
        <p className="mt-1 text-muted-foreground">Average time per question: {formatAverage(spent.total, spent.count)}</p>
        <Button className="mt-8" onClick={onExit}>Back to subjects</Button>
      </div>
    );
  }

  const crumbs = q.deck_path.split(" > ").slice(1).join(" › ");
  const last = i + 1 === questions.length;

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="font-semibold text-primary">Question {i + 1} of {questions.length}</span>
        {timer > 0 && (
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
      {timer > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full bg-accent transition-all duration-1000 ease-linear", left <= 10 && "bg-destructive")}
            style={{ width: `${(100 * left) / timer}%` }}
          />
        </div>
      )}

      <div className="qb-html mt-5 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: q.stem }} />

      <div className="mt-6 space-y-3">
        {q.options.length ? (
          q.options.map((o, k) => {
            const L = LETTERS[k];
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
        <Button variant="outline" onClick={() => setFinished(true)}>End session</Button>
        <Button disabled={!done} onClick={() => (last ? setFinished(true) : setI(i + 1))}>{last ? "Finish" : "Next"}</Button>
      </div>
    </div>
  );
}
