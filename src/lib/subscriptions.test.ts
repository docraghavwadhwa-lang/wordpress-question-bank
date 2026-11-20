import { describe, expect, it } from "vitest";
import { freeQuestionCount, discountedPrice, allocationEnd, subscriptionActive, couponSchema } from "./subscriptions";
describe("subscription rules", () => {
  it("makes 10% of each subject free, rounded down to whole questions", () => { expect(freeQuestionCount(340)).toBe(34); expect(freeQuestionCount(1072)).toBe(107); });
  it("applies a generated percentage coupon", () => { expect(discountedPrice(149900,20)).toBe(119920); });
  it("charges the non-crossed-out offer price less the coupon", () => { expect(discountedPrice(399900,10)).toBe(359910); expect(discountedPrice(599900,0)).toBe(599900); });
  it("accepts enabled and disabled coupon states", () => { expect(couponSchema.parse({code:"college20",percent:20,enabled:false})).toEqual({code:"COLLEGE20",percent:20,enabled:false}); });
  it("rejects discounts outside 1–100 percent", () => { expect(couponSchema.safeParse({code:"TEST",percent:101,enabled:true}).success).toBe(false); });
  it("allocates calendar months with start and end dates", () => { expect(allocationEnd("2026-11-20",12)).toBe("2027-11-20"); expect(allocationEnd("2026-01-31",1)).toBe("2026-02-28"); });
  it("allows access only during the approved period", () => { const s={starts_at:"2026-11-20T00:00:00Z",ends_at:"2027-11-20T00:00:00Z",revoked:false}; expect(subscriptionActive(s,Date.parse("2026-11-21"))).toBe(true); expect(subscriptionActive(s,Date.parse("2027-11-20"))).toBe(false); expect(subscriptionActive({...s,revoked:true},Date.parse("2026-11-21"))).toBe(false); });
});