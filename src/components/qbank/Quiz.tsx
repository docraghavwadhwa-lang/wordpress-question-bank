import { useEffect, useRef, useState } from "react";
import { Bookmark, Star, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAverage, recordAttempt, setBookmark, type Question } from "@/lib/qbank";
import { answerFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import { QuestionHtml } from "./QuestionHtml";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const LETTERS = "ABCDE";

export type QuizProgress = { index: number; score: number; answered: number; spent: { total: number; count: number }; choices?: Record<string, string | null> };

export function Quiz({
  questions,
  timer,
  userId,
  bookmarks,
  bookmarksEnabled = true,
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
  test = false,
}: {
  questions: Question[];
  timer: number;
  userId: string | null;
  bookmarks: Set<number>;
  bookmarksEnabled?: boolean;
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
  /** Test mode: answers stay hidden until the whole test is submitted. */
  test?: boolean;
}) {
  const review = mode === "review";
  const [i, setI] = useState(initial?.index ?? 0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [done, setDone] = useState(review);
  const [timedOut, setTimedOut] = useState(false);
  const testTotal = timer * questions.length;
  const [left, setLeft] = useState(test ? testTotal : timer);
  const testStart = useRef(Date.now());
  const [score, setScore] = useState(initial?.score ?? 0);
  const [answered, setAnswered] = useState(initial?.answered ?? 0);
  const [spent, setSpent] = useState(initial?.spent ?? { total: 0, count: 0 });
  const [choices, setChoices] = useState<Record<string, string | null>>(initial?.choices ?? {});
  const [marks, setMarks] = useState(bookmarks);
  const [finished, setFinished] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [revisiting, setRevisiting] = useState(false);
  const [revisitList, setRevisitList] = useState<number[]>([]);
  const skipped = questions.map((question, index) => ({ question, index })).filter(({ question }) => !Object.prototype.hasOwnProperty.call(choices, question.id));
  const [today, setToday] = useState(todayCount);
  const [xp, setXp] = useState<number[]>([]);
  const t0 = useRef(Date.now());
  const q = questions[i] as Question;

  useEffect(() => {
    t0.current = Date.now();
    const saved = review ? reviewChoices : choices;
    setChosen(saved?.[q?.id] ?? null);
    setDone(review || (!test && Object.prototype.hasOwnProperty.call(saved ?? {}, q?.id)));
    setTimedOut(false);
    if (!test) setLeft(timer);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [i, timer, review]);

  useEffect(() => {
    if (!review) onProgress?.({ index: i, score, answered, spent, choices });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, score, answered, spent, choices]);

  useEffect(() => {
    if (!timer || (done && !test) || finished || review) return;
    if (left <= 0 && test) { submitTest(); return; }
    if (left <= 0) {
      setTimedOut(true);
      answer(null);
      return;
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, timer, done, finished]);

  function finish(reachedEnd = i + 1 === questions.length && done) {
    setFinished(true);
    onFinish?.({ score, answered, seconds: spent.total, choices, completed: reachedEnd });
  }

  /** Move on without answering; a skipped question isn't scored or recorded. */
  function skip() {
    if (revisiting) {
      const after = revisitList.find(index => index > i && skipped.some(row => row.index === index));
      if (after !== undefined) setI(after); else setSubmitOpen(true);
    } else if (i + 1 === questions.length) setSubmitOpen(true);
    else setI(i + 1);
  }
  function complete() {
    if (!review && mode === "practice" && skipped.length) setSubmitOpen(true);
    else finish(true);
  }
  function next() {
    if (revisiting) {
      const after = revisitList.find(index => index > i && skipped.some(row => row.index === index && index !== i));
      if (after !== undefined) setI(after); else complete();
    } else if (i + 1 === questions.length) complete(); else setI(i + 1);
  }

  /** Score every answer at once, record the attempts, then show results. */
  function submitTest() {
    let sc = 0, ans = 0;
    const per = Math.max(1, ((Date.now() - testStart.current) / 1000) / Math.max(1, Object.keys(choices).length));
    for (const question of questions) {
      const letter = choices[question.id];
      if (!letter || !question.answer) continue;
      ans++;
      const ok = letter === question.answer;
      if (ok) sc++;
      if (userId) void recordAttempt(userId, question.id, letter, ok, per).then(() => onAnswered?.());
    }
    const seconds = (Date.now() - testStart.current) / 1000;
    setScore(sc); setAnswered(ans); setSpent({ total: seconds, count: ans || 1 });
    setSubmitOpen(false); setFinished(true);
    onFinish?.({ score: sc, answered: ans, seconds, choices, completed: true });
  }

  function answer(letter: string | null) {
    if (test) {
      if (!letter) return;
      setChosen(letter);
      setChoices(c => ({ ...c, [q.id]: letter }));
      return;
    }
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
    if (!userId || !bookmarksEnabled) return;
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
        {mode === "practice" && <RateQbank />}
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
          {mode === "blitz" && "Daily Blitz · "}{review && "Reading · "}{test && "Test · "}{revisiting ? <>Skipped question {Math.max(1, revisitList.indexOf(i) + 1)} of {revisitList.length}</> : <>Question {i + 1} of {questions.length}</>}
        </span>
        {timer > 0 && !review && (
          <span className={cn("inline-flex items-center gap-1 font-semibold", left <= 10 && "text-destructive")}>
            <Timer className="h-4 w-4" /> {test ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : `${left}s`}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{crumbs}</span>
        {userId && bookmarksEnabled && (
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
            style={{ width: `${(100 * left) / (test ? testTotal : timer)}%` }}
          />
        </div>
      )}
      <QuestionHtml html={q.stem} className="mt-5 text-lg leading-relaxed" />

      <div className="mt-6 space-y-3">
        {q.options.length ? (
          q.options.map((o, k) => {
            const L = LETTERS[k] ?? String(k);
            const right = done && q.answer === L;
            const wrong = done && chosen === L && q.answer !== L;
            return (
              <div
                key={L}
                role="button"
                tabIndex={done ? -1 : 0}
                aria-disabled={done}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); answer(L); } }}
                onClick={() => answer(L)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left leading-snug transition-colors",
                  !done && "hover:border-accent hover:bg-secondary",
                  right && "border-success bg-success-soft",
                  wrong && "border-destructive bg-danger-soft",
                  test && chosen === L && "border-primary bg-secondary ring-1 ring-primary",
                )}
              >
                <span className="font-semibold text-primary">{L}.</span>
                <QuestionHtml html={o} className="min-w-0 flex-1 break-words" />
              </div>
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
            <QuestionHtml html={q.explanation} className="rounded-xl bg-secondary p-4 text-sm leading-relaxed sm:p-5" />
          )}
        </div>
      )}

      {test ? <>
        <div className="mt-8 flex flex-wrap justify-between gap-3">
          <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Button>
          <div className="flex gap-2">
            {!last && <Button variant="outline" onClick={() => setI(i + 1)}>Next</Button>}
            <Button onClick={() => setSubmitOpen(true)}>Submit test</Button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-1.5" aria-label="Question palette">
          {questions.map((question, n) => <button key={question.id} type="button" onClick={() => setI(n)} aria-label={`Question ${n + 1}`} aria-current={n === i} className={cn("h-8 w-8 rounded-md border text-xs font-semibold", choices[question.id] ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground", n === i && "ring-2 ring-accent")}>{n + 1}</button>)}
        </div>
        <Dialog open={submitOpen} onOpenChange={setSubmitOpen}><DialogContent className="max-w-sm"><DialogTitle className="font-display text-2xl text-primary">Submit test?</DialogTitle><DialogDescription>{questions.length - Object.keys(choices).length} of {questions.length} questions unanswered. Answers and explanations appear after you submit.</DialogDescription><Button onClick={submitTest}>Submit test</Button><Button variant="outline" onClick={() => setSubmitOpen(false)}>Keep going</Button></DialogContent></Dialog>
      </> : <>
      <div className="mt-8 flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => finish()}>End session</Button>
          {review && i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}>Previous</Button>}
        </div>
        <div className="flex gap-2">
          {!done && !review && <Button variant="ghost" onClick={skip}>Skip</Button>}
          <Button disabled={!done} onClick={next}>{last && !revisiting ? "Finish" : "Next"}</Button>
        </div>
      </div>
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}><DialogContent className="max-w-sm"><DialogTitle className="font-display text-2xl text-primary">Ready to submit?</DialogTitle><DialogDescription>{skipped.length} skipped {skipped.length === 1 ? "question" : "questions"} left in this Q-bank.</DialogDescription><Button onClick={() => { const first = skipped[0]; if (first) { setRevisiting(true); setRevisitList(skipped.map(row => row.index)); setI(first.index); } setSubmitOpen(false); }}>Revisit skipped questions</Button><Button variant="outline" onClick={() => { setSubmitOpen(false); finish(true); }}>Submit</Button></DialogContent></Dialog>
      </>}
    </div>
  );
}

/** Students can rate a Q-bank after finishing it; the displayed Q-bank rating stays fixed at 5 stars. */
function RateQbank() {
  const [stars, setStars] = useState(0);
  return (
    <div className="mt-6 rounded-xl bg-secondary p-4">
      <p className="text-sm font-medium text-primary">{stars ? "Thanks for rating this Q-bank!" : "How was this Q-bank?"}</p>
      <div className="mt-2 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(n)} className="rounded p-1">
            <Star className={cn("h-7 w-7 text-gold transition-transform hover:scale-110", n <= stars && "fill-current")} />
          </button>
        ))}
      </div>
    </div>
  );
}
