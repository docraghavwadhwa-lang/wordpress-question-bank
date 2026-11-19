import { describe, expect, it } from "vitest";
import { formatAverage, groupBookmarks } from "./qbank";

it("groups only each subject's bookmarked questions for review or practice", () => {
  expect(groupBookmarks([
    { id: 1, deck_path: "Anatomy > Bones" },
    { id: 2, deck_path: "Radiology > Chest" },
    { id: 3, deck_path: "Anatomy > Nerves" },
    { id: 1, deck_path: "Anatomy > Bones" },
  ])).toEqual([{ subject: "Anatomy", ids: [1, 3] }, { subject: "Radiology", ids: [2] }]);
});

describe("average time per question", () => {
  it("shows seconds under a minute", () => {
    expect(formatAverage(45, 2)).toBe("22.5 s");
  });
  it("shows minutes and seconds from a minute up", () => {
    expect(formatAverage(150, 2)).toBe("1 min 15 s");
  });
  it("shows a dash when nothing was answered", () => {
    expect(formatAverage(0, 0)).toBe("—");
  });
});
