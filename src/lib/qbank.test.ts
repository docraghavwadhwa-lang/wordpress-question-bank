import { describe, expect, it } from "vitest";
import { formatAverage } from "./qbank";

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
