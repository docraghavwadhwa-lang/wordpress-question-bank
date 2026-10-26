import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Quote, Sparkles } from "lucide-react";
import { fetchQuestionOfDay, quoteForDay, todayKey } from "@/lib/daily";
import { cn } from "@/lib/utils";

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
      <div className="qb-html mt-4 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: d.stem }} />
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {d.options.map((o, k) => {
          const L = LETTERS[k] ?? String(k);
          const right = done && d.answer === L;
          const wrong = done && chosen === L && d.answer !== L;
          return (
            <button
              key={L}
              type="button"
              disabled={done}
              onClick={() => pick(L)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-snug transition-colors",
                !done && "hover:border-accent hover:bg-secondary",
                right && "border-success bg-success-soft",
                wrong && "border-destructive bg-danger-soft",
              )}
            >
              <span className="font-semibold text-primary">{L}.</span>
              <span className="qb-html min-w-0 flex-1 break-words" dangerouslySetInnerHTML={{ __html: o }} />
            </button>
          );
        })}
      </div>
      {done && d.explanation && (
        <details className="mt-4 rounded-xl bg-secondary p-4 text-sm">
          <summary className="cursor-pointer font-medium text-primary">See explanation</summary>
          <div className="qb-html mt-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: d.explanation }} />
        </details>
      )}
      <p className="mt-4 text-xs text-muted-foreground">A new question every day. This one doesn't count towards your streak.</p>
    </section>
  );
}

export function QuoteOfTheDay() {
  const quote = quoteForDay(todayKey());
  return (
    <section className="relative mt-16 overflow-hidden rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground sm:px-16">
      <Quote className="mx-auto h-8 w-8 text-accent" strokeWidth={1.5} />
      <blockquote className="mx-auto mt-5 max-w-2xl font-display text-2xl italic leading-snug sm:text-3xl">“{quote}”</blockquote>
      <div className="mx-auto mt-6 h-px w-16 bg-accent" />
    </section>
  );
}
