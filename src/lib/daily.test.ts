import { describe, expect, it } from "vitest";
import { QOTD_SUBJECTS, quoteForDay, subjectForDay } from "./daily";

describe("question of the day", () => {
  it("only uses Radiology, Medicine, OBG, Paediatrics and Psychiatry, all of them", () => {
    const seen = new Set(Array.from({ length: 2000 }, (_, i) => subjectForDay(`k${i}`)));
    expect([...seen].sort()).toEqual(["Medicine", "Obstetrics & Gyenacology", "Pediatrics", "Psychiatry", "Radiology"]);
    expect(QOTD_SUBJECTS).toHaveLength(5);
  });
  it("same day gives the same pick, quotes change across days", () => {
    expect(subjectForDay("2026-10-26")).toBe(subjectForDay("2026-10-26"));
    const qs = new Set(Array.from({ length: 30 }, (_, i) => quoteForDay(`2026-11-${i}`)));
    expect(qs.size).toBeGreaterThan(20);
  });
});
