import { openDB, type DBSchema } from "idb";
import { supabase } from "@/integrations/supabase/client";
import type { Deck, Question } from "@/lib/qbank";

export type StoredQuestion = Question & { subject: string; sort_key?: string };
export type OfflineData = { decks: Deck[]; questions: StoredQuestion[]; savedAt: string };
export type OfflineSummary = { savedAt: string; count: number; generation: string };
type QuestionRow = StoredQuestion & { generation: string; answerable: number };
type DeckRow = Deck & { generation: string };
interface BankDB extends DBSchema {
  questions: { key: [string, number]; value: QuestionRow; indexes: { deck: [string, string]; subject: [string, string, number]; answerable: [string, number, number] } };
  decks: { key: [string, string]; value: DeckRow; indexes: { generation: string } };
  meta: { key: string; value: OfflineSummary };
}
export const OFFLINE_GUIDANCE = "Offline: Please connect once and tap 'Download for offline' on the home page";
export function offlineErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message === OFFLINE_GUIDANCE ? OFFLINE_GUIDANCE : fallback;
}
export function isOffline() { return typeof navigator !== "undefined" && !navigator.onLine; }
export function isNetworkError(e: unknown): boolean { return e instanceof TypeError || isOffline(); }

function database() {
  return openDB<BankDB>("qb-bank", 1, {
    upgrade(db) {
      const q = db.createObjectStore("questions", { keyPath: ["generation", "id"] });
      q.createIndex("deck", ["generation", "deck_path"]);
      q.createIndex("subject", ["generation", "subject", "id"]);
      q.createIndex("answerable", ["generation", "answerable", "id"]);
      db.createObjectStore("decks", { keyPath: ["generation", "path"] }).createIndex("generation", "generation");
      db.createObjectStore("meta");
    },
  });
}
export async function loadOfflineSummary(): Promise<OfflineSummary | null> {
  try { const db = await database(); try { return await db.get("meta", "active") ?? null; } finally { db.close(); } }
  catch { return null; }
}

/** Never expose an interrupted download; activate only after all batches commit. */
export async function saveOfflineData(data: OfflineData) {
  const generation = crypto.randomUUID();
  const db = await database();
  try {
    for (let i = 0; i < data.questions.length; i += 1000) {
      const tx = db.transaction("questions", "readwrite");
      for (const q of data.questions.slice(i, i + 1000)) void tx.store.put({ ...q, generation, answerable: q.answer == null ? 0 : 1 });
      await tx.done;
    }
    const tx = db.transaction(["decks", "meta"], "readwrite");
    for (const d of data.decks) void tx.objectStore("decks").put({ ...d, generation });
    void tx.objectStore("meta").put({ generation, savedAt: data.savedAt, count: data.questions.length }, "active");
    await tx.done;
  } finally { db.close(); }
}

async function pruneExcept(generation?: string) {
  const db = await database();
  try {
    for (const name of ["questions", "decks"] as const) {
      const tx = db.transaction(name, "readwrite");
      let cursor = await tx.store.openCursor();
      while (cursor) { if (cursor.value.generation !== generation) await cursor.delete(); cursor = await cursor.continue(); }
      await tx.done;
    }
    if (!generation) await db.clear("meta");
  } finally { db.close(); }
}
export async function clearOfflineData() { await pruneExcept(); }

/** Reads only indexed chapter rows, not the entire bank. */
export async function offlineDeckQuestions(path: string): Promise<StoredQuestion[] | null> {
  const active = await loadOfflineSummary();
  if (!active) return null;
  const db = await database();
  try {
    const tx = db.transaction("questions");
    const index = tx.store.index("deck");
    const [exact, children] = await Promise.all([
      index.getAll([active.generation, path]),
      index.getAll(IDBKeyRange.bound([active.generation, path + " > "], [active.generation, path + " > \uffff"])),
    ]);
    return [...exact, ...children].sort((a, b) => (a.sort_key ?? "").localeCompare(b.sort_key ?? "") || a.id - b.id);
  } finally { db.close(); }
}
export async function offlineDecks(): Promise<Deck[] | null> {
  const active = await loadOfflineSummary(); if (!active) return null;
  const db = await database();
  try { return (await db.getAllFromIndex("decks", "generation", active.generation)).sort((a,b) => a.sort_key.localeCompare(b.sort_key)); }
  finally { db.close(); }
}
export async function offlineQuestionsByIds(ids: number[]): Promise<StoredQuestion[] | null> {
  const active = await loadOfflineSummary(); if (!active) return null;
  const db = await database();
  try {
    const tx = db.transaction("questions");
    const rows = await Promise.all(ids.map(id => tx.store.get([active.generation, id])));
    return rows.filter((q): q is QuestionRow => q !== undefined);
  } finally { db.close(); }
}
/** Only keys are read for deterministic daily selection; HTML stays on disk. */
export async function offlineQuestionIds(subject?: string): Promise<number[] | null> {
  const active = await loadOfflineSummary(); if (!active) return null;
  const db = await database();
  try {
    const keys = subject === undefined
      ? await db.getAllKeysFromIndex("questions", "answerable", IDBKeyRange.bound([active.generation, 1, 0], [active.generation, 1, Number.MAX_SAFE_INTEGER]))
      : await db.getAllKeysFromIndex("questions", "subject", IDBKeyRange.bound([active.generation, subject, 0], [active.generation, subject, Number.MAX_SAFE_INTEGER]));
    return keys.map(key => key[1]);
  } finally { db.close(); }
}

export async function networkRead<T>(request: PromiseLike<T>, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([Promise.resolve(request), new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new TypeError("Network timeout")), ms); })]); }
  finally { clearTimeout(timer); }
}
async function retryRead<T>(request: (signal: AbortSignal) => PromiseLike<{ data: T; error: { message: string; code?: string } | null }>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await request(controller.signal);
      if (result.error) throw result.error;
      return result.data;
    } catch (error) {
      if (attempt >= 2 || (typeof error === "object" && error !== null && "code" in error && /^[24]/.test(String(error.code)))) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
    } finally { clearTimeout(timer); }
  }
}
let downloading = false;
export async function downloadAllQuestions(onProgress?: (done: number, total: number) => void): Promise<OfflineSummary> {
  if (downloading) throw new Error("Download already in progress");
  downloading = true;
  const generation = crypto.randomUUID();
  const db = await database().catch(error => { downloading = false; throw error; });
  try {
    if (typeof navigator.storage?.persist === "function") await navigator.storage.persist().catch(() => false);
    const active = await loadOfflineSummary();
    await pruneExcept(active?.generation);
    for (let from = 0; ; from += 1000) {
      const data = await retryRead(signal => supabase.from("decks").select("path, subject, depth, sort_key, question_count").order("sort_key").range(from, from + 999).abortSignal(signal));
      const rows = (data ?? []) as Deck[];
      const tx = db.transaction("decks", "readwrite");
      for (const d of rows) void tx.store.put({ ...d, generation });
      await tx.done;
      if (rows.length < 1000) break;
    }
    const counted = await networkRead(supabase.from("questions").select("id", { count: "exact", head: true }));
    if (counted.error) throw counted.error;
    const total = counted.count ?? 0;
    let count = 0;
    for (let from = 0; ; from += 1000) {
      const data = await retryRead(signal => supabase.from("questions").select("id, deck_path, subject, stem, options, answer, explanation, sort_key").order("sort_key").order("id").range(from, from + 999).abortSignal(signal));
      const rows = (data ?? []) as unknown as StoredQuestion[];
      const tx = db.transaction("questions", "readwrite");
      for (const q of rows) void tx.store.put({ ...q, generation, answerable: q.answer == null ? 0 : 1 });
      await tx.done;
      count += rows.length;
      onProgress?.(count, total || count);
      if (rows.length < 1000) break;
    }
    if (!count || (total && count !== total) || await db.count("questions", IDBKeyRange.bound([generation, 0], [generation, Number.MAX_SAFE_INTEGER])) !== count) throw new Error("Incomplete download — please try again");
    const summary = { generation, count, savedAt: new Date().toISOString() };
    await db.put("meta", summary, "active");
    await pruneExcept(generation);
    // The old large Cache API snapshot is deliberately not parsed or migrated.
    if (typeof caches !== "undefined") await caches.delete("qb-data-v1").catch(() => false);
    return summary;
  } catch (error) {
    const active = await loadOfflineSummary();
    await pruneExcept(active?.generation).catch(() => {});
    throw error;
  } finally { db.close(); downloading = false; }
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
