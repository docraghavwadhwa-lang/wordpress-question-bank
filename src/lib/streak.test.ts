import { describe, expect, it } from "vitest";
import { computeStreaks, dayKey, addDays, isMilestone, tierFor } from "./streak";

const today = new Date(2026, 9, 26);
function counts(days: Record<number, number>) {
  const m = new Map<string, number>();
  for (const [offset, n] of Object.entries(days)) m.set(dayKey(addDays(today, -Number(offset))), n);
  return m;
}

describe("streak tiers", () => {
  it("Achiever is 20, Scholar 30, Topper 50 questions a day", () => {
    expect(tierFor(20).name).toBe("Achiever");
    expect(tierFor(30).name).toBe("Scholar");
    expect(tierFor(50).name).toBe("Topper");
  });
});

describe("streak counting", () => {
  it("counts consecutive days that met the goal", () => {
    expect(computeStreaks(counts({ 0: 20, 1: 25, 2: 20 }), 20, today).current).toBe(3);
  });
  it("a day below the goal breaks the streak", () => {
    expect(computeStreaks(counts({ 0: 20, 1: 19, 2: 20 }), 20, today).current).toBe(1);
  });
  it("today not yet done keeps yesterday's streak alive", () => {
    expect(computeStreaks(counts({ 0: 5, 1: 30, 2: 30 }), 30, today).current).toBe(2);
  });
  it("tracks the longest streak", () => {
    expect(computeStreaks(counts({ 0: 50, 5: 50, 6: 50, 7: 50 }), 50, today).longest).toBe(3);
  });
});

describe("celebrations", () => {
  it("fire on multiples of 7 and on day 30, 60, 90, 100, 120", () => {
    for (const n of [7, 14, 21, 28, 30, 60, 90, 100, 120]) expect(isMilestone(n)).toBe(true);
  });
  it("do not fire on ordinary days", () => {
    for (const n of [0, 1, 6, 13, 31, 101]) expect(isMilestone(n)).toBe(false);
  });
});
