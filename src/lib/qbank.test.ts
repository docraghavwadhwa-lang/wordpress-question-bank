import { describe, expect, it, vi } from "vitest";
import { formatAverage, groupBookmarks } from "./qbank";
import { supabase } from "@/integrations/supabase/client";
import { fetchMarked } from "./qbank";

it("retains an old wrong attempt in Mistake Vault without a time filter", async () => {
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), then: vi.fn() };
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.order.mockReturnValue(chain);
  chain.range.mockResolvedValue({ data: [{ id: 1, question_id: 123, correct: false, created_at: "2000-01-01T00:00:00Z" }], error: null });
  const auth = vi.spyOn(supabase.auth, "getSession").mockResolvedValue({ data: { session: null }, error: null });
  const from = vi.spyOn(supabase, "from").mockImplementation(((table: string) => table === "attempts" ? chain : { select: () => ({ in: async () => ({ data: [{ id: 123, deck_path: "Anatomy > Bones", stem: "Q", options: [], answer: "A", explanation: null }], error: null }) }) }) as typeof supabase.from);
  expect((await fetchMarked()).mistakes).toEqual([{ id: 123, deck_path: "Anatomy > Bones" }]);
  auth.mockRestore(); from.mockRestore();
});

it("groups only each subject's bookmarked questions for review or practice", () => {
  expect(groupBookmarks([
    { id: 1, deck_path: "Anatomy > Bones" },
    { id: 2, deck_path: "Radiology > Chest" },
    { id: 3, deck_path: "Anatomy > Nerves" },
    { id: 1, deck_path: "Anatomy > Bones" },
  ])).toEqual([{ subject: "Anatomy", ids: [1, 3] }, { subject: "Radiology", ids: [2] }]);
});

describe("average time per question", () => {
  it("shows seconds under a minute", () => {
    expect(formatAverage(45, 2)).toBe("22.5 s");
  });
  it("shows minutes and seconds from a minute up", () => {
    expect(formatAverage(150, 2)).toBe("1 min 15 s");
  });
  it("shows a dash when nothing was answered", () => {
    expect(formatAverage(0, 0)).toBe("—");
  });
});
