import { describe, expect, it } from "vitest";
import { TRIAL_PRESETS, trialEnd, trialSchema, DEFAULT_TRIAL_DAYS, trialCountdown, downloadsAllowed } from "./trials";
import { resolveAppearance } from "./appearance";
const trial = { user: "00000000-0000-4000-8000-000000000001", plan: "panacea", start: "2026-11-21", note: "" };
describe("trial and appearance rules", () => {
 it("defaults requested trials to fourteen days", () => { expect(DEFAULT_TRIAL_DAYS).toBe(14); });
 it("displays remaining days, hours, minutes and seconds", () => { expect(trialCountdown("2026-12-05T15:30:45Z", Date.parse("2026-12-03T12:15:00Z"))).toEqual({ days: 2, hours: 3, minutes: 15, seconds: 45 }); });
 it("rolls seconds into minutes", () => { expect(trialCountdown("2026-12-05T15:30:00Z", Date.parse("2026-12-05T15:29:01Z"))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 59 }); });
 it("never counts below zero after expiry", () => { expect(trialCountdown("2026-12-05T15:30:00Z", Date.parse("2026-12-05T15:30:01Z"))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 }); });
 it("freezes downloads during a trial", () => { expect(downloadsAllowed([{ is_trial: true, revoked: false, starts_at: "2026-11-21", ends_at: "2026-12-05" }], false, Date.parse("2026-11-22"))).toBe(false); });
 it("allows downloads for non-trial subscriptions", () => { expect(downloadsAllowed([{ is_trial: false, revoked: false, starts_at: "2026-11-21", ends_at: "2027-11-21" }], false, Date.parse("2026-11-22"))).toBe(true); });
 it("offers seven days", () => { expect(TRIAL_PRESETS[0]).toBe(7); expect(trialEnd(trial.start, 7)).toBe("2026-11-28"); });
 it("offers fourteen days", () => { expect(TRIAL_PRESETS[1]).toBe(14); expect(trialEnd(trial.start, 14)).toBe("2026-12-05"); });
 it("offers twenty-one days", () => { expect(TRIAL_PRESETS[2]).toBe(21); expect(trialEnd(trial.start, 21)).toBe("2026-12-12"); });
 it("accepts custom ten days", () => { expect(trialSchema.parse({ ...trial, days: 10 }).days).toBe(10); expect(trialEnd(trial.start, 10)).toBe("2026-12-01"); });
 it("rejects fractional and nonpositive days", () => { for (const days of [0, -7, 1.5]) expect(trialSchema.safeParse({ ...trial, days }).success).toBe(false); });
 it("defaults to light", () => { expect(resolveAppearance(null)).toBe("light"); });
 it("restores selected dark mode", () => { expect(resolveAppearance("dark")).toBe("dark"); });
});
