import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Quote, Sparkles } from "lucide-react";
import { fetchQuestionOfDay, quoteForDay, todayKey } from "@/lib/daily";
import { cn } from "@/lib/utils";
import { QuestionHtml } from "./QuestionHtml";

const LETTERS = "ABCDE";

/** Question of the day — answered locally only; never recorded as an attempt. */
export function QuestionOfTheDay() {
  const key = todayKey();
  const q = useQuery({ queryKey: ["qotd", key], queryFn: () => fetchQuestionOfDay(key), staleTime: Infinity });
  const [chosen, setChosen] = useState<string | null>(null);
  const store = `qb_qotd_${key}`;
  useEffect(() => setChosen(localStorage.getItem(store)), [store]);

  function pick(L: string) {
    if (chosen) return;
    setChosen(L);
    localStorage.setItem(store, L);
  }

  if (q.isLoading) return <div className="h-48 animate-pulse rounded-2xl border bg-card" />;
  if (!q.data) return null;
  const d = q.data;
  const done = !!chosen;
  const subject = d.subject === "Obstetrics & Gyenacology" ? "Obstetrics & Gynaecology" : d.subject;

  return (
    <section className="rounded-2xl border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          <Sparkles className="h-4 w-4" /> Question of the day
        </p>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">{subject}</span>
      </div>
      <QuestionHtml html={d.stem} className="mt-4 text-lg leading-relaxed" />
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {d.options.map((o, k) => {
          const L = LETTERS[k] ?? String(k);
          const right = done && d.answer === L;
          const wrong = done && chosen === L && d.answer !== L;
          return (
            <div
              key={L}
              role="button"
              tabIndex={done ? -1 : 0}
              aria-disabled={done}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(L); } }}
              onClick={() => pick(L)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-snug transition-colors",
                !done && "hover:border-accent hover:bg-secondary",
                right && "border-success bg-success-soft",
                wrong && "border-destructive bg-danger-soft",
              )}
            >
              <span className="font-semibold text-primary">{L}.</span>
              <QuestionHtml html={o} className="min-w-0 flex-1 break-words" />
            </div>
          );
        })}
      </div>
      {done && d.explanation && (
        <details className="mt-4 rounded-xl bg-secondary p-4 text-sm">
          <summary className="cursor-pointer font-medium text-primary">See explanation</summary>
          <QuestionHtml html={d.explanation} className="mt-3 leading-relaxed" />
        </details>
      )}
      <p className="mt-4 text-xs text-muted-foreground">A new question every day. This one doesn't count towards your streak.</p>
    </section>
  );
}

export function QuoteOfTheDay() {
  const quote = quoteForDay(todayKey());
  return (
    <section className="relative mt-10 border-l-2 border-primary bg-secondary/60 px-6 py-7 text-primary sm:px-10">
      <Quote className="h-6 w-6 text-gold" strokeWidth={1.5} />
      <blockquote className="mt-3 max-w-3xl font-display text-2xl italic leading-snug sm:text-3xl">“{quote}”</blockquote>
      <div className="mt-4 h-px w-12 bg-primary/30" />
    </section>
  );
}
