import { describe, expect, it } from "vitest";
import { QOTD_SUBJECTS, quoteForDay, subjectForDay } from "./daily";

describe("question of the day", () => {
  it("never picks Medicine; includes Physiology, Biochemistry, Dermatology", () => {
    const seen = new Set(Array.from({ length: 2000 }, (_, i) => subjectForDay(`k${i}`)));
    expect(seen.has("Medicine")).toBe(false);
    for (const s of ["Physiology", "Biochemistry", "Dermatology"]) expect(seen.has(s)).toBe(true);
    const allowed = new Set(QOTD_SUBJECTS.map((s) => s.subject));
    for (const s of seen) expect(allowed.has(s)).toBe(true);
  });
  it("favours Surgery and OBG", () => {
    const n: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) { const s = subjectForDay(`k${i}`); n[s] = (n[s] ?? 0) + 1; }
    const big = (n["Surgery"] ?? 0) + (n["Obstetrics & Gyenacology"] ?? 0);
    expect(big / 2000).toBeGreaterThan(0.4);
  });
  it("same day gives the same pick, quotes change across days", () => {
    expect(subjectForDay("2026-10-26")).toBe(subjectForDay("2026-10-26"));
    const qs = new Set(Array.from({ length: 30 }, (_, i) => quoteForDay(`2026-11-${i}`)));
    expect(qs.size).toBeGreaterThan(20);
  });
});
