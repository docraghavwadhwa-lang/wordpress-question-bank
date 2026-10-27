import { supabase } from "@/integrations/supabase/client";

export type Deck = { path: string; subject: string; depth: number; sort_key: string; question_count: number };
export type Question = {
  id: number;
  deck_path: string;
  stem: string;
  options: string[];
  answer: string | null;
  explanation: string | null;
};

export const TIMERS = [
  { label: "None", value: 0 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
  { label: "90s", value: 90 },
];

export async function fetchDecks(): Promise<Deck[]> {
  const out: Deck[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("decks")
      .select("path, subject, depth, sort_key, question_count")
      .order("sort_key")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as Deck[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const COLS = "id, deck_path, stem, options, answer, explanation";

/** Every question in a subject / section / chapter (deck path prefix). */
export async function fetchDeckQuestions(path: string): Promise<Question[]> {
  const out: Question[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("questions")
      .select(COLS)
      .or(`deck_path.eq.${quote(path)},deck_path.like.${quote(escapeLike(path) + " > %")}`)
      .order("sort_key")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as Question[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function fetchBookmarkedQuestions(): Promise<Question[]> {
  const ids = [...(await fetchBookmarkIds())];
  const out: Question[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from("questions").select(COLS).in("id", ids.slice(i, i + 200));
    if (error) throw error;
    out.push(...((data ?? []) as unknown as Question[]));
  }
  return out;
}

export async function fetchBookmarkIds(): Promise<Set<number>> {
  const ids = new Set<number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("bookmarks").select("question_id").range(from, from + 999);
    if (error) throw error;
    (data ?? []).forEach((r) => ids.add(Number(r.question_id)));
    if (!data || data.length < 1000) break;
  }
  return ids;
}

export async function setBookmark(userId: string, questionId: number, on: boolean) {
  if (on) await supabase.from("bookmarks").insert({ user_id: userId, question_id: questionId });
  else await supabase.from("bookmarks").delete().eq("user_id", userId).eq("question_id", questionId);
}

export async function recordAttempt(userId: string, questionId: number, chosen: string, correct: boolean, seconds: number) {
  await supabase
    .from("attempts")
    .insert({ user_id: userId, question_id: questionId, chosen, correct, seconds: Math.round(seconds) });
}

export async function fetchStats(): Promise<{ attempts: number; correct: number }> {
  const all = await supabase.from("attempts").select("id", { count: "exact", head: true }).eq("archived", false);
  const ok = await supabase.from("attempts").select("id", { count: "exact", head: true }).eq("archived", false).eq("correct", true);
  return { attempts: all.count ?? 0, correct: ok.count ?? 0 };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i] as T;
    a[i] = a[j] as T;
    a[j] = t;
  }
  return a;
}

export function formatAverage(totalSeconds: number, count: number): string {
  if (!count) return "—";
  const avg = totalSeconds / count;
  if (avg >= 60) return `${Math.floor(avg / 60)} min ${Math.round(avg % 60)} s`;
  return `${Math.round(avg * 10) / 10} s`;
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}
function quote(s: string) {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Fetch questions by id, keeping the given order. */
export async function fetchQuestionsByIds(ids: number[]): Promise<Question[]> {
  const map = new Map<number, Question>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from("questions").select(COLS).in("id", ids.slice(i, i + 200));
    if (error) throw error;
    ((data ?? []) as unknown as Question[]).forEach((q) => map.set(Number(q.id), q));
  }
  return ids.map((id) => map.get(id)).filter(Boolean) as Question[];
}

export type Marked = { id: number; deck_path: string };

/** Bookmarked questions and the mistake vault (latest attempt wrong), with each question's deck. */
export async function fetchMarked(): Promise<{ bookmarks: Marked[]; mistakes: Marked[] }> {
  const bookmarks: Marked[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("bookmarks").select("question_id, questions(deck_path)").range(from, from + 999);
    if (error) throw error;
    (data ?? []).forEach((r) => bookmarks.push({ id: Number(r.question_id), deck_path: (r.questions as { deck_path: string } | null)?.deck_path ?? "" }));
    if (!data || data.length < 1000) break;
  }
  const latest = new Map<number, Marked & { correct: boolean }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("attempts")
      .select("id, question_id, correct, questions(deck_path)")
      .eq("archived", false)
      .order("created_at")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    (data ?? []).forEach((r) =>
      latest.set(Number(r.question_id), { id: Number(r.question_id), correct: r.correct, deck_path: (r.questions as { deck_path: string } | null)?.deck_path ?? "" }),
    );
    if (!data || data.length < 1000) break;
  }
  const mistakes = [...latest.values()].filter((m) => !m.correct).map(({ id, deck_path }) => ({ id, deck_path }));
  return { bookmarks, mistakes };
}

/** Questions in `list` that belong to deck `path` (or any deck below it). */
export function inDeck(list: Marked[], path: string): number[] {
  return list.filter((m) => m.deck_path === path || m.deck_path.startsWith(path + " > ")).map((m) => m.id);
}

export type SavedSession = {
  title: string;
  ids: number[];
  timer: number;
  index: number;
  score: number;
  answered: number;
  spent: { total: number; count: number };
};
const SESSION_KEY = "qb_session";
export function loadSession(): SavedSession | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}
export function saveSession(s: SavedSession | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}
