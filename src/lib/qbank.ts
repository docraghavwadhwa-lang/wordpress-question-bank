import { supabase } from "@/integrations/supabase/client";
import { readQueue, writeOrQueue } from "@/lib/offline";
import { isNetworkError, offlineDecks, offlineDeckQuestions, offlineQuestionsByIds, OFFLINE_GUIDANCE, isOffline, networkRead } from "@/lib/offline-data";

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
  const local = await offlineDecks().catch(() => null);
  if (local?.length) return local;
  try {
    if (isOffline()) throw new Error(OFFLINE_GUIDANCE);
    const out: Deck[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await timed(supabase
        .from("decks")
        .select("path, subject, depth, sort_key, question_count")
        .order("sort_key")
        .range(from, from + 999));
      if (error) throw error;
      out.push(...((data ?? []) as Deck[]));
      if (!data || data.length < 1000) break;
    }
    return out;
  } catch (e) {
    const offline = await offlineDecks();
    if (offline) return offline;
    if (isOffline()) throw new Error(OFFLINE_GUIDANCE);
    throw e;
  }
}

/** Give up on a slow/hung network call after 8s so the offline copy can take over. */
const timed = networkRead;

const COLS = "id, deck_path, stem, options, answer, explanation";

/** Every question in a subject / section / chapter (deck path prefix). */
export async function fetchDeckQuestions(path: string): Promise<Question[]> {
  const local = await offlineDeckQuestions(path).catch(() => null);
  if (local?.length) return local;
  try {
    if (isOffline()) throw new Error(OFFLINE_GUIDANCE);
    const out: Question[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await timed(supabase
        .from("questions")
        .select(COLS)
        .or(`deck_path.eq.${quote(path)},deck_path.like.${quote(escapeLike(path) + " > %")}`)
        .order("sort_key")
        .order("id")
        .range(from, from + 999));
      if (error) throw error;
      out.push(...((data ?? []) as unknown as Question[]));
      if (!data || data.length < 1000) break;
    }
    return out;
  } catch (e) {
    const offline = await offlineDeckQuestions(path);
    if (offline) return offline;
    if (isOffline()) throw new Error(OFFLINE_GUIDANCE);
    throw e;
  }
}

export async function fetchBookmarkedQuestions(): Promise<Question[]> {
  return fetchQuestionsByIds([...(await fetchBookmarkIds())]);
}

export async function fetchBookmarkIds(knownUserId?: string): Promise<Set<number>> {
  const userId = knownUserId ?? (await supabase.auth.getSession()).data.session?.user.id;
  if (!userId) return new Set();
  const key = `qb_bookmarks:${userId}`;
  const ids = new Set<number>();
  try {
    if (!navigator.onLine) throw new TypeError("Offline");
    for (let from = 0; ; from += 1000) {
      const { data, error } = await timed(supabase.from("bookmarks").select("question_id").eq("user_id", userId).range(from, from + 999));
      if (error) throw error;
      (data ?? []).forEach((r) => ids.add(Number(r.question_id)));
      if (!data || data.length < 1000) break;
    }
  } catch {
    try { for (const id of JSON.parse(localStorage.getItem(key) ?? "[]")) ids.add(Number(id)); } catch { /* no saved bookmarks */ }
  }
  for (const write of readQueue()) {
    if (write.kind === "unbookmark" && write.user_id === userId) ids.delete(write.question_id);
    else if (write.kind === "insert" && write.table === "bookmarks" && write.row['user_id'] === userId) ids.add(Number(write.row['question_id']));
  }
  localStorage.setItem(key, JSON.stringify([...ids]));
  return ids;
}

export async function setBookmark(userId: string, questionId: number, on: boolean) {
  const key = `qb_bookmarks:${userId}`;
  let saved: number[] = [];
  try { saved = JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { /* empty cache */ }
  const ids = new Set(saved);
  if (on) ids.add(questionId); else ids.delete(questionId);
  localStorage.setItem(key, JSON.stringify([...ids]));
  if (on) await writeOrQueue({ kind: "insert", table: "bookmarks", row: { user_id: userId, question_id: questionId } });
  else await writeOrQueue({ kind: "unbookmark", user_id: userId, question_id: questionId });
}

export async function recordAttempt(userId: string, questionId: number, chosen: string, correct: boolean, seconds: number) {
  await writeOrQueue({
    kind: "insert",
    table: "attempts",
    row: { user_id: userId, question_id: questionId, chosen, correct, seconds: Math.round(seconds), created_at: new Date().toISOString() },
  });
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
  const local = await offlineQuestionsByIds(ids).catch(() => null);
  if (local && ids.length && local.length === ids.length) {
    const map = new Map(local.map((q) => [Number(q.id), q]));
    return ids.map((id) => map.get(id)).filter(Boolean) as Question[];
  }
  try {
    if (isOffline()) throw new Error(OFFLINE_GUIDANCE);
    const map = new Map<number, Question>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await timed(supabase.from("questions").select(COLS).in("id", ids.slice(i, i + 200)));
      if (error) throw error;
      ((data ?? []) as unknown as Question[]).forEach((q) => map.set(Number(q.id), q));
    }
    return ids.map((id) => map.get(id)).filter(Boolean) as Question[];
  } catch (e) {
    const offline = await offlineQuestionsByIds(ids);
    if (offline) return offline;
    if (isOffline()) throw new Error(OFFLINE_GUIDANCE);
    throw e;
  }
}

export type Marked = { id: number; deck_path: string };

/** Bookmarked questions and the mistake vault (latest attempt wrong), with each question's deck. */
export async function fetchMarked(): Promise<{ bookmarks: Marked[]; mistakes: Marked[] }> {
  const bIds = [...await fetchBookmarkIds()];
  const latest = new Map<number, boolean>();
  try {
  if (!navigator.onLine) throw new TypeError("Offline");
  for (let from = 0; ; from += 1000) {
    const { data, error } = await timed(supabase
      .from("attempts")
      .select("id, question_id, correct")
      .eq("archived", false)
      .order("created_at")
      .order("id")
      .range(from, from + 999));
    if (error) throw error;
    (data ?? []).forEach((r) => latest.set(Number(r.question_id), r.correct));
    if (!data || data.length < 1000) break;
  }
  } catch (error) { if (!isNetworkError(error)) throw error; }
  const wrong = [...latest].filter(([, ok]) => !ok).map(([id]) => id);
  const all = [...new Set([...bIds, ...wrong])];
  const decks = new Map((await fetchQuestionsByIds(all)).map(q => [q.id, q.deck_path]));
  const pick = (ids: number[]): Marked[] => ids.flatMap(id => {
    const deck_path = decks.get(id);
    return deck_path ? [{ id, deck_path }] : [];
  });
  return { bookmarks: pick(bIds), mistakes: pick(wrong) };
}

/** Questions in `list` that belong to deck `path` (or any deck below it). */
export function inDeck(list: Marked[], path: string): number[] {
  return list.filter((m) => m.deck_path === path || m.deck_path.startsWith(path + " > ")).map((m) => m.id);
}

export function groupBookmarks(list: Marked[]): { subject: string; ids: number[] }[] {
  const groups = new Map<string, Set<number>>();
  for (const question of list) {
    const subject = question.deck_path.split(" > ")[0];
    if (!subject) continue;
    const ids = groups.get(subject) ?? new Set<number>();
    ids.add(question.id);
    groups.set(subject, ids);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([subject, ids]) => ({ subject, ids: [...ids] }));
}

export type SavedSession = {
  quizKey?: string;
  choices?: Record<string, string | null>;
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
