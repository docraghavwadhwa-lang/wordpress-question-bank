import { describe, expect, it } from "vitest";
import { freeQuestionCount, discountedPrice, allocationEnd, subscriptionActive, couponSchema, manualPaymentUpiId, lockedSubjects, checkoutCoupon } from "./subscriptions";
describe("subscription rules", () => {
  it("unlocks every subject during an approved trial", () => { const subs = [{ plan_id: "reagent", is_trial: true, starts_at: "2026-11-21", ends_at: "2026-12-05", revoked: false }]; expect([...lockedSubjects(subs, [{ plan_id: "reagent", subject: "Anatomy" }], ["Anatomy", "Medicine"], Date.parse("2026-11-22"))]).toEqual([]); expect([...lockedSubjects(subs, [{ plan_id: "reagent", subject: "Anatomy" }], ["Anatomy", "Medicine"], Date.parse("2026-12-06"))]).toEqual(["Anatomy", "Medicine"]); });
  it("applies AIR-PG by default while allowing a replacement coupon", () => { expect(checkoutCoupon("")).toBe("AIR-PG"); expect(checkoutCoupon(" air-pg ")).toBe("AIR-PG"); expect(checkoutCoupon(" college20 ")).toBe("COLLEGE20"); });
  it("uses the supplied manual UPI payment destination", () => { expect(manualPaymentUpiId).toBe("docraghavwadhwa-1@okicici"); });
  it("makes 10% of each subject free, rounded down to whole questions", () => { expect(freeQuestionCount(340)).toBe(34); expect(freeQuestionCount(1072)).toBe(107); });
  it("applies a generated percentage coupon", () => { expect(discountedPrice(149900,20)).toBe(119920); });
  it("charges the non-crossed-out offer price less the coupon", () => { expect(discountedPrice(399900,10)).toBe(359910); expect(discountedPrice(599900,0)).toBe(599900); });
  it("accepts enabled and disabled coupon states", () => { expect(couponSchema.parse({code:"college20",percent:20,enabled:false})).toEqual({code:"COLLEGE20",percent:20,enabled:false}); });
  it("rejects discounts outside 1–100 percent", () => { expect(couponSchema.safeParse({code:"TEST",percent:101,enabled:true}).success).toBe(false); });
  it("allocates calendar months with start and end dates", () => { expect(allocationEnd("2026-11-20",12)).toBe("2027-11-20"); expect(allocationEnd("2026-01-31",1)).toBe("2026-02-28"); });
  it("allows access only during the approved period", () => { const s={starts_at:"2026-11-20T00:00:00Z",ends_at:"2027-11-20T00:00:00Z",revoked:false}; expect(subscriptionActive(s,Date.parse("2026-11-21"))).toBe(true); expect(subscriptionActive(s,Date.parse("2027-11-20"))).toBe(false); expect(subscriptionActive({...s,revoked:true},Date.parse("2026-11-21"))).toBe(false); });
  it("locks subjects outside the active plan's coverage", () => {
    const subs = [{ plan_id: "base", starts_at: "2026-11-20T00:00:00Z", ends_at: "2027-11-20T00:00:00Z", revoked: false }];
    const coverage = [{ plan_id: "base", subject: "Anatomy" }, { plan_id: "panacea", subject: "Medicine" }];
    expect([...lockedSubjects(subs, coverage, ["Anatomy", "Medicine"], Date.parse("2026-11-21"))]).toEqual(["Medicine"]);
    expect(lockedSubjects([], coverage, ["Anatomy"], Date.parse("2026-11-21")).has("Anatomy")).toBe(true);
    expect(lockedSubjects(subs, coverage, ["Anatomy"], Date.parse("2028-01-01")).has("Anatomy")).toBe(true);
  });
});