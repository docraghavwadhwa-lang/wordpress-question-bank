import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Flame, Medal, RotateCcw, Target } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/qbank/AppHeader";
import { Celebration } from "@/components/qbank/Celebration";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useStreak } from "@/hooks/use-streak";
import { fetchSubjectStats, resetProgress } from "@/lib/profile";
import { formatAverage } from "@/lib/qbank";
import { addDays, dayKey, parseKey, tierFor } from "@/lib/streak";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Progress & streak | MedQuiz by Nirmaya Care" },
      { name: "description", content: "Your daily streak, learning timeline and subject-wise Q-Bank progress." },
      { property: "og:title", content: "Progress & streak | MedQuiz by Nirmaya Care" },
      { property: "og:description", content: "Your daily streak, learning timeline and subject-wise Q-Bank progress." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { user } = useAuth();
  const s = useStreak(user?.id);
  const tier = tierFor(s.goal);
  const target = s.profile.data?.streak_target_days ?? 30;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <Celebration days={s.celebrate} stats={s.celebrationStats} onClose={s.closeCelebration} />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Your journey</p>
        <h1 className="text-5xl text-primary">Progress & <em>streak</em></h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Flame} label="Current streak" value={`${s.streak.current} days`} />
          <StatCard icon={Medal} label="Longest streak" value={`${s.streak.longest} days`} />
          <StatCard icon={Target} label={`Today · ${tier.name}`} value={`${Math.min(s.streak.today, s.goal)} / ${s.goal}`} bar={s.streak.today / s.goal} />
          <StatCard icon={Clock} label={`${target}-day goal`} value={`${Math.min(s.streak.current, target)} / ${target}`} bar={s.streak.current / target} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Change your daily goal or streak length in your <Link to="/profile" className="font-medium text-primary underline underline-offset-4">profile</Link>.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <StreakCalendar counts={s.counts} goal={s.goal} />
          <Timeline rows={s.daily.data ?? []} goal={s.goal} />
        </div>

        <SubjectStats />
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, bar }: { icon: typeof Flame; label: string; value: string; bar?: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-accent/15"><Icon className="h-5 w-5 text-accent" strokeWidth={1.8} /></span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-2xl text-primary">{value}</div>
        </div>
      </div>
      {bar !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, bar * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function StreakCalendar({ counts, goal }: { counts: Map<string, number>; goal: number }) {
  const [page, setPage] = useState(0);
  const today = new Date();
  const lastSat = addDays(today, 6 - today.getDay() + page * 28);
  const first = addDays(lastSat, -27);
  const days = Array.from({ length: 28 }, (_, i) => addDays(first, i));
  const met = (d: Date) => (counts.get(dayKey(d)) ?? 0) >= goal;
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <section className="rounded-2xl border bg-card p-5 lg:col-span-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-primary">Streak tracker</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setPage(page - 1)} aria-label="Earlier"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-32 text-center text-sm font-medium">{fmt(first)} – {fmt(lastSat)}</span>
          <Button variant="ghost" size="icon" onClick={() => setPage(page + 1)} disabled={page >= 0} aria-label="Later"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-y-2 text-center">
        {DOW.map((d) => <div key={d} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>)}
        {days.map((d, i) => {
          const n = counts.get(dayKey(d)) ?? 0;
          const ok = met(d);
          const future = d > today;
          const isToday = dayKey(d) === dayKey(today);
          const left = ok && i % 7 !== 0 && met(addDays(d, -1));
          const right = ok && i % 7 !== 6 && met(addDays(d, 1));
          const pct = Math.min(1, n / goal);
          return (
            <div key={i} className="relative flex h-11 items-center justify-center" title={`${n} questions`}>
              {left && <span className="absolute left-0 top-1/2 h-7 w-1/2 -translate-y-1/2 bg-success-soft" />}
              {right && <span className="absolute right-0 top-1/2 h-7 w-1/2 -translate-y-1/2 bg-success-soft" />}
              <span
                className={cn(
                  "relative grid h-9 w-9 place-items-center rounded-full text-sm",
                  ok && "bg-primary font-semibold text-primary-foreground",
                  !ok && !future && "text-foreground",
                  future && "text-muted-foreground/50",
                  isToday && !ok && "ring-2 ring-accent",
                )}
                style={!ok && n > 0 ? { background: `conic-gradient(var(--accent) ${pct * 360}deg, var(--secondary) 0)` } : undefined}
              >
                {!ok && n > 0 ? <span className="grid h-7 w-7 place-items-center rounded-full bg-card">{d.getDate()}</span> : d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-primary" /> Goal met</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "conic-gradient(var(--accent) 180deg, var(--secondary) 0)" }} /> Partly done</span>
      </div>
    </section>
  );
}

function Timeline({ rows, goal }: { rows: { day: string; questions: number; correct: number; seconds: number }[]; goal: number }) {
  const recent = [...rows].reverse().slice(0, 14);
  return (
    <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
      <h2 className="font-display text-2xl text-primary">Learning timeline</h2>
      {!recent.length && <p className="mt-4 text-sm text-muted-foreground">Answer your first question and your timeline starts here.</p>}
      <ol className="mt-4 max-h-[22rem] space-y-0 overflow-y-auto pr-1">
        {recent.map((r) => {
          const ok = r.questions >= goal;
          return (
            <li key={r.day} className="relative border-l-2 border-border pb-4 pl-5 last:pb-0">
              <span className={cn("absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-card", ok ? "bg-primary" : "bg-accent")} />
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-primary">{parseKey(r.day).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
                {ok && <span className="text-[10px] font-semibold uppercase tracking-wider text-success">Goal met</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {r.questions} questions · {r.questions ? Math.round((100 * r.correct) / r.questions) : 0}% correct · {formatAverage(r.seconds, r.questions)} avg
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full", ok ? "bg-primary" : "bg-accent")} style={{ width: `${Math.min(100, (100 * r.questions) / goal)}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Gauge({ value, total }: { value: number; total: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const pct = total ? Math.min(1, value / total) : 0;
  return (
    <div className="flex shrink-0 flex-col items-center">
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 180 180" className="h-full w-full rotate-[135deg]">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--secondary)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--primary)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${arc * pct} ${c}`} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl text-primary tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">of {total}</span>
      </div>
    </div>
      <span className="-mt-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Questions completed</span>
    </div>
  );
}

function verdict(acc: number, attempted: number) {
  if (!attempted) return { t: "Let's begin", d: "Start a chapter to see how you're doing.", tone: "bg-secondary" };
  if (acc >= 80) return { t: "Excellent", d: "Your performance is brilliant — you're on your way to owning your dream.", tone: "bg-success-soft" };
  if (acc >= 60) return { t: "Good going", d: "Solid work. Revise the explanations of the ones you missed.", tone: "bg-success-soft" };
  return { t: "Keep pushing", d: "Every wrong answer is a lesson. Re-attempt this subject after revision.", tone: "bg-danger-soft" };
}

function SubjectStats() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["subject-stats"], queryFn: fetchSubjectStats });
  const [tab, setTab] = useState<string>("Overall");
  const rows = q.data ?? [];
  const cur = useMemo(() => {
    if (tab === "Overall")
      return rows.reduce((a, r) => ({ total: a.total + r.total, attempted: a.attempted + r.attempted, correct: a.correct + r.correct }), { total: 0, attempted: 0, correct: 0 });
    return rows.find((r) => r.subject === tab) ?? { total: 0, attempted: 0, correct: 0 };
  }, [rows, tab]);
  const acc = cur.attempted ? Math.round((100 * cur.correct) / cur.attempted) : 0;
  const v = verdict(acc, cur.attempted);
  const all = tab === "Overall";

  async function reset() {
    try {
      await resetProgress(all ? null : tab);
      await qc.invalidateQueries({ queryKey: ["subject-stats"] });
      await qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success(all ? "All progress reset" : `${tab} reset`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl text-primary">Statistics</h2>
      <p className="text-sm text-muted-foreground">Based on your latest answer to each question.</p>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {["Overall", ...rows.map((r) => r.subject)].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors", tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50")}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border bg-card p-6">
        <div className="flex flex-col-reverse items-center gap-6 md:flex-row md:justify-between">
          <div className="grid w-full min-w-0 flex-1 grid-cols-2 gap-x-3 sm:grid-cols-3 gap-y-5">
            <Num label="Attempted" value={cur.attempted} />
            <Num label="Correct" value={cur.correct} />
            <Num label="Accuracy" value={`${acc}%`} />
            <Num label="Wrong" value={cur.attempted - cur.correct} />
            <Num label="Remaining" value={Math.max(0, cur.total - cur.attempted)} />
            <Num label="Completed" value={`${cur.total ? Math.round((100 * cur.attempted) / cur.total) : 0}%`} />
          </div>
          <Gauge value={cur.attempted} total={cur.total} />
        </div>
        <div className={cn("mt-6 rounded-xl px-5 py-4", v.tone)}>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">{v.t}</div>
          <p className="text-sm text-foreground">{v.d}</p>
        </div>
        <div className="mt-5 flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!cur.attempted}><RotateCcw className="h-4 w-4" /> {all ? "Reset all progress" : `Reset ${tab}`}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{all ? "Reset all your progress?" : `Reset ${tab}?`}</AlertDialogTitle>
                <AlertDialogDescription>
                  Your {all ? "" : `${tab} `}statistics will start again from zero so you can re-attempt the Q-Bank fresh. Your streak and timeline stay as they are.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={reset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  );
}

function Num({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <div className="break-words font-display text-2xl leading-tight text-primary tabular-nums sm:text-3xl">{value}</div>
      <div className="truncate text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
