import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { customAccessSchema } from "./admin";
import { allocationEnd } from "./subscriptions";
import { featureAvailable } from "./features";
const allocation = { user: "00000000-0000-4000-8000-000000000001", plan: "panacea", months: 6, start: "2026-11-20", amount: 0, note: "Campus scholarship" };
describe("administrator controls", () => {
  it("allows a free subscription with a zero recorded cost", () => { expect(customAccessSchema.parse(allocation).amount).toBe(0); });
  it("allows a custom paid subscription independent of public prices", () => { expect(customAccessSchema.parse({ ...allocation, amount: 75000 }).amount).toBe(75000); });
  it("uses the administrator's chosen six-month duration", () => { expect(allocationEnd(allocation.start, allocation.months)).toBe("2027-05-20"); });
  it("rejects negative allocation prices", () => { expect(customAccessSchema.safeParse({ ...allocation, amount: -100 }).success).toBe(false); });
  it("turns off a product feature for students", () => { expect(featureAvailable([{ key: "qbanks", enabled: false }], "qbanks")).toBe(false); });
  it("retains administrator access when a feature is disabled", () => { expect(featureAvailable([{ key: "qbanks", enabled: false }], "qbanks", true)).toBe(true); });
});