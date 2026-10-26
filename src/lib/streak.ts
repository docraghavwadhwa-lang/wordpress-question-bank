export const TIERS = [
  { id: "achiever", name: "Achiever", goal: 20, blurb: "20 questions a day — a steady daily habit." },
  { id: "scholar", name: "Scholar", goal: 30, blurb: "30 questions a day — serious, consistent study." },
  { id: "topper", name: "Topper", goal: 50, blurb: "50 questions a day — for those aiming for the top rank." },
] as const;

export const TARGET_DAYS = [30, 60, 90, 100, 180, 365];

export function tierFor(goal: number) {
  return TIERS.find((t) => t.goal === goal) ?? TIERS[0];
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** counts: day key -> questions answered that day. */
export function computeStreaks(counts: Map<string, number>, goal: number, today: Date) {
  const ok = (d: Date) => (counts.get(dayKey(d)) ?? 0) >= goal;
  let start = ok(today) ? today : addDays(today, -1);
  let current = 0;
  while (ok(start)) {
    current++;
    start = addDays(start, -1);
  }
  let longest = 0;
  const days = [...counts.keys()].filter((k) => (counts.get(k) ?? 0) >= goal).sort();
  let run = 0;
  let prev: string | null = null;
  for (const k of days) {
    const [y, m, d] = k.split("-").map(Number) as [number, number, number];
    const expected = prev ? dayKey(addDays(parseKey(prev), 1)) : null;
    run = expected === k ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = dayKey(new Date(y, m - 1, d));
  }
  return { current, longest: Math.max(longest, current), today: counts.get(dayKey(today)) ?? 0, todayDone: ok(today) };
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** Celebrate every 7 days, every 30 days, and day 100 (and each hundred). */
export function isMilestone(n: number): boolean {
  return n > 0 && (n % 7 === 0 || n % 30 === 0 || n % 100 === 0);
}

export function milestoneMessage(n: number): { title: string; body: string } {
  if (n % 100 === 0)
    return { title: `${n} days. Legendary.`, body: `A hundred-day habit is what separates good doctors from great ones. Your patients will one day thank you for this discipline.` };
  if (n % 30 === 0) {
    const months = n / 30;
    return {
      title: `${months} ${months === 1 ? "month" : "months"}. Unshaken.`,
      body: `${n} days of unwavering focus — this isn't just a streak, it's who you are becoming. Keep walking the path to becoming a great doctor.`,
    };
  }
  const weeks = n / 7;
  return {
    title: `${weeks} ${weeks === 1 ? "week" : "weeks"} strong!`,
    body: `${n} days in a row. Consistency is the quiet secret of every great doctor — you're right on track. Keep going.`,
  };
}
