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
});
