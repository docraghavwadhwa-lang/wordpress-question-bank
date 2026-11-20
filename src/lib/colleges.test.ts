import { describe, expect, it } from "vitest";
import directory from "./college-directory.json";
import { collegesForState, isListedCollege } from "./colleges";

describe("Supplied state-wise college directory", () => {
  it("contains all 861 spreadsheet colleges", () => {
    expect(directory).toHaveLength(861);
  });
  it("shows only the selected state's colleges", () => {
    expect(collegesForState("Andhra Pradesh")).toHaveLength(41);
    expect(collegesForState("Andhra Pradesh", "AIIMS").map(row => row.name)).toEqual(["AIIMS Mangalagiri"]);
    expect(collegesForState("Maharashtra")).toHaveLength(90);
  });
  it("requires a listed college from that state instead of a student-added name", () => {
    expect(isListedCollege("Andhra Pradesh", "AIIMS Mangalagiri")).toBe(true);
    expect(isListedCollege("Delhi", "AIIMS Mangalagiri")).toBe(false);
    expect(isListedCollege("Delhi", "My invented college")).toBe(false);
  });
});