import { supabase } from "@/integrations/supabase/client";
import type { Deck, Question } from "@/lib/qbank";

/**
 * Full question-bank snapshot saved on the device (Cache API) so the whole app
 * works with zero internet after one download. ~16k questions ≈ 10–15 MB.
 */
export type StoredQuestion = Question & { subject: string };
export type OfflineData = { decks: Deck[]; questions: StoredQuestion[]; savedAt: string };

const CACHE_NAME = "qb-data-v1";
const KEY = "/__offline__/all";

async function store() {
  return caches.open(CACHE_NAME);
}

export async function saveOfflineData(data: OfflineData) {
  const c = await store();
  await c.put(KEY, new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }));
}

export async function loadOfflineData(): Promise<OfflineData | null> {
  try {
    const c = await store();
    const res = await c.match(KEY);
    if (!res) return null;
    return (await res.json()) as OfflineData;
  } catch {
    return null;
  }
}

export async function clearOfflineData() {
  try {
    const c = await store();
    await c.delete(KEY);
  } catch {
    /* ignore */
  }
}

/** True when the failure looks like a network problem (worth trying the offline copy). */
export function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine);
}

/** Download every deck and question, reporting progress 0..1. */
export async function downloadAllQuestions(onProgress?: (done: number, total: number) => void): Promise<OfflineData> {
  const decks: Deck[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("decks")
      .select("path, subject, depth, sort_key, question_count")
      .order("sort_key")
      .range(from, from + 999);
    if (error) throw error;
    decks.push(...((data ?? []) as Deck[]));
    if (!data || data.length < 1000) break;
  }

  const { count, error: countError } = await supabase.from("questions").select("id", { count: "exact", head: true });
  if (countError) throw countError;
  const total = count ?? 0;

  const questions: StoredQuestion[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, deck_path, subject, stem, options, answer, explanation, sort_key")
      .order("sort_key")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    questions.push(...((data ?? []) as unknown as StoredQuestion[]));
    onProgress?.(questions.length, total || questions.length);
    if (!data || data.length < 1000) break;
  }

  const snapshot: OfflineData = { decks, questions, savedAt: new Date().toISOString() };
  await saveOfflineData(snapshot);
  return snapshot;
}

// ---- Pure filters over the snapshot (unit-tested) ----

/** Questions in a deck path or any deck below it, in stored (sort_key) order. */
export function filterDeckQuestions(all: StoredQuestion[], path: string): StoredQuestion[] {
  return all.filter((q) => q.deck_path === path || q.deck_path.startsWith(path + " > "));
}

/** Questions matching the given ids, in the order the ids were given. */
export function pickByIds(all: StoredQuestion[], ids: number[]): StoredQuestion[] {
  const map = new Map(all.map((q) => [Number(q.id), q]));
  return ids.map((id) => map.get(id)).filter(Boolean) as StoredQuestion[];
}

/** All questions that have an answer, ordered by id (mirrors the online Blitz query). */
export function answerableById(all: StoredQuestion[]): StoredQuestion[] {
  return all.filter((q) => q.answer != null).sort((a, b) => a.id - b.id);
}

/** Questions of one subject, ordered by id (mirrors the online QOTD query). */
export function subjectById(all: StoredQuestion[], subject: string): StoredQuestion[] {
  return all.filter((q) => q.subject === subject).sort((a, b) => a.id - b.id);
}
