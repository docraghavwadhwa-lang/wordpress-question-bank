import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const backend = vi.hoisted(() => ({ requests: [] as { table: string; from: number; to: number }[], failAt: -1, failOnce: false }));
vi.mock("./offline-license.functions", () => ({ issueOfflineLicense: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) }, from: (table: string) => {
  let from = 0, to = 999, head = false;
  const builder = {
    select: (_: string, options?: { head?: boolean }) => { head = !!options?.head; return builder; },
    order: () => builder,
    eq: () => builder,
    range: (a: number, b: number) => { from = a; to = b; return builder; },
    abortSignal: () => builder,
    then: (resolve: (value: unknown) => unknown) => {
      if (head) return Promise.resolve({ count: 2001, error: null }).then(resolve);
      backend.requests.push({ table, from, to });
      if (table === "questions" && from === backend.failAt) {
        if (backend.failOnce) { backend.failOnce = false; backend.failAt = -1; }
        return Promise.resolve({ data: null, error: { message: "Network failed" } }).then(resolve);
      }
      const data = table === "decks" ? [{ path: "Biochemistry", subject: "Biochemistry", depth: 1, sort_key: "1", question_count: 2001 }]
        : Array.from({ length: Math.max(0, Math.min(2001, to + 1) - from) }, (_, i) => question(from + i + 1));
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  }; return builder;
} } }));
import { clearOfflineData, downloadAllQuestions, loadOfflineSummary, offlineDeckQuestions, offlineQuestionsByIds, offlineQuestionIds, saveOfflineData, OFFLINE_GUIDANCE } from "./offline-data";
import { fetchDeckQuestions } from "./qbank";
function question(id: number) { return { id, is_free: true, deck_path: id <= 13 ? "Biochemistry > Nucleotides Structure & Metabolism" : "Biochemistry > Other", subject: "Biochemistry", stem: `q${id}`, options: ["A", "B"], answer: "A", explanation: null, sort_key: String(id).padStart(5, "0") }; }
beforeEach(async () => { await clearOfflineData(); backend.requests = []; backend.failAt = -1; backend.failOnce = false; vi.spyOn(navigator, "onLine", "get").mockReturnValue(true); });
afterEach(() => vi.restoreAllMocks());
describe("indexed offline question bank", () => {
  it("never returns paid or legacy unclassified offline rows", async () => {
    const { is_free: _free, ...legacy } = question(3);
    await saveOfflineData({ decks: [], questions: [question(1), { ...question(2), is_free: false }, legacy], savedAt: "2026-11-20T06:00:00Z" });
    expect((await offlineQuestionsByIds([1,2,3]))?.map(q=>q.id)).toEqual([1]);
  });
  it("commits 1000-question batches and reads only the 13-question chapter", async () => {
    const progress = vi.fn();
    const summary = await downloadAllQuestions(progress);
    expect(summary.count).toBe(2001);
    expect(progress.mock.calls).toEqual([[1000, 2001], [2000, 2001], [2001, 2001]]);
    expect(backend.requests.filter(r => r.table === "questions").map(r => [r.from, r.to])).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    backend.requests = [];
    expect((await fetchDeckQuestions("Biochemistry > Nucleotides Structure & Metabolism")).map(q => q.id)).toEqual(Array.from({length: 13}, (_, i) => i + 1));
    expect(backend.requests).toEqual([]);
    expect((await offlineDeckQuestions("Biochemistry"))?.length).toBe(2001);
  });
  it("retries a fluctuating connection without duplicating a batch", async () => {
    backend.failAt = 1000; backend.failOnce = true;
    await downloadAllQuestions();
    expect(backend.requests.filter(r => r.table === "questions" && r.from === 1000)).toHaveLength(2);
    expect((await offlineQuestionIds())?.length).toBe(2001);
  });
  it("keeps the previous complete download when an update fails", async () => {
    await saveOfflineData({ decks: [], questions: [question(99)], savedAt: "2026-11-19T08:30:00Z" });
    backend.failAt = 1000;
    await expect(downloadAllQuestions()).rejects.toEqual({ message: "Network failed" });
    expect((await loadOfflineSummary())?.count).toBe(1);
    expect((await offlineQuestionsByIds([99, 1]))?.map(q => q.id)).toEqual([99]);
  });
  it("shows download guidance when no complete bank exists offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await expect(fetchDeckQuestions("Biochemistry")).rejects.toThrow(OFFLINE_GUIDANCE);
    expect(backend.requests).toEqual([]);
  });
  it("preserves requested ID order and excludes similarly named chapters", async () => {
    await saveOfflineData({ decks: [], questions: [question(1), { ...question(2), deck_path: "Biochemistry > Nucleotides Structure & Metabolism2" }], savedAt: "2026-11-19T08:30:00Z" });
    expect((await offlineDeckQuestions(question(1).deck_path))?.map(q => q.id)).toEqual([1]);
    expect((await offlineQuestionsByIds([2, 999, 1]))?.map(q => q.id)).toEqual([2, 1]);
  });
});
