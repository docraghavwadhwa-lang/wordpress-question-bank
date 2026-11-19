import { describe, expect, it } from "vitest";
import { answerableById, filterDeckQuestions, pickByIds, subjectById, type StoredQuestion } from "./offline-data";

const q = (id: number, deck_path: string, subject = "Medicine", answer: string | null = "A"): StoredQuestion => ({
  id,
  deck_path,
  subject,
  stem: `q${id}`,
  options: ["a", "b"],
  answer,
  explanation: null,
});

const ALL: StoredQuestion[] = [
  q(3, "Medicine > Cardio"),
  q(1, "Medicine"),
  q(2, "Surgery > General", "Surgery"),
  q(4, "Medicine > Cardio > ECG", "Medicine", null),
];

describe("offline snapshot filters", () => {
  it("filterDeckQuestions includes the deck itself and everything below it", () => {
    expect(filterDeckQuestions(ALL, "Medicine").map((x) => x.id)).toEqual([3, 1, 4]);
    expect(filterDeckQuestions(ALL, "Medicine > Cardio").map((x) => x.id)).toEqual([3, 4]);
    expect(filterDeckQuestions(ALL, "Surgery").map((x) => x.id)).toEqual([2]);
  });

  it("filterDeckQuestions does not match a deck that only shares a prefix", () => {
    const list = [q(1, "Medicine"), q(2, "Medicine2")];
    expect(filterDeckQuestions(list, "Medicine").map((x) => x.id)).toEqual([1]);
  });

  it("pickByIds keeps the requested order and skips missing ids", () => {
    expect(pickByIds(ALL, [2, 1, 999]).map((x) => x.id)).toEqual([2, 1]);
  });

  it("answerableById drops questions without an answer and sorts by id", () => {
    expect(answerableById(ALL).map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("subjectById filters one subject and sorts by id", () => {
    expect(subjectById(ALL, "Surgery").map((x) => x.id)).toEqual([2]);
    expect(subjectById(ALL, "Medicine").map((x) => x.id)).toEqual([1, 3, 4]);
  });
});
