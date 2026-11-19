import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: async () => ({ error: null }) }) } }));
import { readQueue, writeOrQueue } from "@/lib/offline";

describe("offline queue", () => {
  it("queues an answer instead of losing it when the device is offline", async () => {
    localStorage.clear();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await writeOrQueue({ kind: "insert", table: "attempts", row: { question_id: 7 } });
    expect(readQueue()).toHaveLength(1);
  });
  it("queues a completed quiz review with its original completion time while offline", async () => {
    localStorage.clear();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await writeOrQueue({ kind: "insert", table: "quiz_reviews", row: { user_id: "user-a", completed_at: "2026-11-19T07:00:00Z", choices: { 7: "B" } } });
    expect(readQueue()).toEqual([{ kind: "insert", table: "quiz_reviews", row: { user_id: "user-a", completed_at: "2026-11-19T07:00:00Z", choices: { 7: "B" } } }]);
  });
});
