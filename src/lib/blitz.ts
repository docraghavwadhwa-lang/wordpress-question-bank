import { supabase } from "@/integrations/supabase/client";
import { hash } from "./daily";
import type { Question } from "./qbank";

export const BLITZ_SIZE = 10;
export const BLITZ_TIMER = 60;

/** Same 10 questions for everyone on a given day; changes at midnight. */
export async function fetchBlitz(key: string): Promise<Question[]> {
  const { count, error } = await supabase.from("questions").select("id", { count: "exact", head: true }).not("answer", "is", null);
  if (error) throw error;
  const n = Math.max(1, count ?? 1);
  const offsets = new Set<number>();
  for (let k = 0; offsets.size < Math.min(BLITZ_SIZE, n); k++) offsets.add(hash(`${key}blitz${k}`) % n);
  const rows = await Promise.all(
    [...offsets].map(async (o) => {
      const { data, error: e } = await supabase
        .from("questions")
        .select("id, deck_path, stem, options, answer, explanation")
        .not("answer", "is", null)
        .order("id")
        .range(o, o)
        .single();
      if (e) throw e;
      return data as unknown as Question;
    }),
  );
  return rows;
}

export type BlitzRank = { my_score: number; my_seconds: number; my_rank: number; players: number };

export async function fetchBlitzRank(day: string): Promise<BlitzRank | null> {
  const { data, error } = await supabase.rpc("qb_blitz_rank", { _day: day });
  if (error) throw error;
  return ((data ?? []) as BlitzRank[])[0] ?? null;
}

export async function saveBlitz(userId: string, day: string, score: number, seconds: number) {
  await supabase.from("blitz_results").insert({ user_id: userId, day, score, seconds: Math.round(seconds) });
}
