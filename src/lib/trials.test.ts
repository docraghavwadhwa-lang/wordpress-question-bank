import { describe, expect, it } from "vitest";
import { TRIAL_PRESETS, trialEnd, trialSchema } from "./trials";
import { resolveAppearance } from "./appearance";
const trial = { user: "00000000-0000-4000-8000-000000000001", plan: "panacea", start: "2026-11-21", note: "" };
describe("trial and appearance rules", () => {
 it("offers seven days", () => { expect(TRIAL_PRESETS[0]).toBe(7); expect(trialEnd(trial.start, 7)).toBe("2026-11-28"); });
 it("offers fourteen days", () => { expect(TRIAL_PRESETS[1]).toBe(14); expect(trialEnd(trial.start, 14)).toBe("2026-12-05"); });
 it("offers twenty-one days", () => { expect(TRIAL_PRESETS[2]).toBe(21); expect(trialEnd(trial.start, 21)).toBe("2026-12-12"); });
 it("accepts custom ten days", () => { expect(trialSchema.parse({ ...trial, days: 10 }).days).toBe(10); expect(trialEnd(trial.start, 10)).toBe("2026-12-01"); });
 it("rejects fractional and nonpositive days", () => { for (const days of [0, -7, 1.5]) expect(trialSchema.safeParse({ ...trial, days }).success).toBe(false); });
 it("defaults to light", () => { expect(resolveAppearance(null)).toBe("light"); });
 it("restores selected dark mode", () => { expect(resolveAppearance("dark")).toBe("dark"); });
});
