import { supabase } from "@/integrations/supabase/client";
import { isOffline, networkRead, offlineQuestionIds, offlineQuestionsByIds, OFFLINE_GUIDANCE } from "@/lib/offline-data";
import quotes from "./quotes.json";
import type { Question } from "./qbank";

/** Local calendar date as YYYY-MM-DD. */
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Deterministic 32-bit hash so every visitor sees the same pick for a day. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Question-of-the-day subjects (stored bank names), rotated evenly. */
export const QOTD_SUBJECTS: { subject: string; weight: number }[] = [
  { subject: "Radiology", weight: 1 },
  { subject: "Medicine", weight: 1 },
  { subject: "Obstetrics & Gyenacology", weight: 1 },
  { subject: "Pediatrics", weight: 1 },
  { subject: "Psychiatry", weight: 1 },
];

export function subjectForDay(key: string) {
  const total = QOTD_SUBJECTS.reduce((a, s) => a + s.weight, 0);
  let r = hash(key + "subject") % total;
  for (const s of QOTD_SUBJECTS) {
    if (r < s.weight) return s.subject;
    r -= s.weight;
  }
  return QOTD_SUBJECTS[0]?.subject ?? "Surgery";
}

export function quoteForDay(key: string): string {
  const list = quotes as string[];
  return list[hash(key + "quote") % list.length] ?? "";
}

export async function fetchQuestionOfDay(key: string): Promise<Question & { subject: string }> {
  const subject = subjectForDay(key);
  try {
    if (isOffline()) throw new Error(OFFLINE_GUIDANCE);
    const { count, error } = await networkRead(supabase.from("questions").select("id", { count: "exact", head: true }).eq("subject", subject));
    if (error) throw error;
    const n = hash(key + "q") % Math.max(1, count ?? 1);
    const { data, error: e2 } = await networkRead(supabase
      .from("questions")
      .select("id, deck_path, stem, options, answer, explanation")
      .eq("subject", subject)
      .order("id")
      .range(n, n)
      .single());
    if (e2) throw e2;
    return { ...(data as unknown as Question), subject };
  } catch (e) {
    const ids = await offlineQuestionIds(subject);
    if (!ids?.length) { if (isOffline()) throw new Error(OFFLINE_GUIDANCE); throw e; }
    const id = ids[hash(key + "q") % ids.length];
    const rows = id === undefined ? null : await offlineQuestionsByIds([id]);
    const question = rows?.[0];
    if (!question) throw new Error(OFFLINE_GUIDANCE);
    return { ...question, subject };
  }
}
