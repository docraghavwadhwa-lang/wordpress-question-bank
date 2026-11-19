import { supabase } from "@/integrations/supabase/client";
import { writeOrQueue } from "@/lib/offline";
import { isNetworkError } from "@/lib/offline-data";

export const REVIEW_WINDOW_MS = 72 * 60 * 60 * 1000;
export type QuizReview = {
  id: string; user_id: string; quiz_key: string; title: string;
  question_ids: number[]; choices: Record<string, string | null>;
  score: number; answered: number; completed_at: string;
};

export function latestReviews(rows: QuizReview[], userId: string, now = Date.now()): QuizReview[] {
  const latest = new Map<string, QuizReview>();
  for (const row of rows) {
    const time = Date.parse(row.completed_at);
    if (row.user_id !== userId || !Number.isFinite(time) || time > now || now - time >= REVIEW_WINDOW_MS) continue;
    const previous = latest.get(row.quiz_key);
    if (!previous || time > Date.parse(previous.completed_at)) latest.set(row.quiz_key, row);
  }
  return [...latest.values()].sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at));
}

function key(userId: string) { return `qb_reviews:${userId}`; }
function read(userId: string): QuizReview[] {
  try { return latestReviews(JSON.parse(localStorage.getItem(key(userId)) ?? "[]"), userId); }
  catch { return []; }
}
function cache(userId: string, rows: QuizReview[]) {
  localStorage.setItem(key(userId), JSON.stringify(latestReviews(rows, userId)));
}
export async function saveQuizReview(row: QuizReview) {
  cache(row.user_id, [row, ...read(row.user_id)]);
  await writeOrQueue({ kind: "insert", table: "quiz_reviews", row });
}
export async function fetchQuizReviews(userId: string): Promise<QuizReview[]> {
  const local = read(userId);
  if (!navigator.onLine) return local;
  try {
    const rows: QuizReview[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("quiz_reviews").select("id,user_id,quiz_key,title,question_ids,choices,score,answered,completed_at")
        .eq("user_id", userId).gt("completed_at", new Date(Date.now() - REVIEW_WINDOW_MS).toISOString())
        .order("completed_at", { ascending: false }).range(from, from + 999);
      if (error) throw error;
      rows.push(...(data ?? []) as QuizReview[]);
      if (!data || data.length < 1000) break;
    }
    const merged = latestReviews([...rows, ...local], userId);
    cache(userId, merged);
    return merged;
  } catch (error) {
    if (isNetworkError(error)) return local;
    throw error;
  }
}