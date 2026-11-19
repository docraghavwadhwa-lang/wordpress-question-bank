import { describe, expect, it } from "vitest";
import { latestReviews, type QuizReview } from "./quiz-reviews";

const now = Date.parse("2026-11-19T07:00:00Z");
const row = (hours: number, id = "one", quiz_key = "Anatomy"): QuizReview => ({
  id, user_id: "user-a", quiz_key, title: quiz_key, question_ids: [11, 12],
  choices: { 11: "B", 12: "A" }, score: 1, answered: 2,
  completed_at: new Date(now - hours * 3600000).toISOString(),
});
describe("completed quiz review rules", () => {
  it("allows review until, but not at or after, 72 hours", () => {
    expect(latestReviews([row(71.999)], "user-a", now)).toHaveLength(1);
    expect(latestReviews([row(72), row(73)], "user-a", now)).toHaveLength(0);
  });
  it("keeps only the latest completed attempt per bank", () => {
    const result = latestReviews([row(5, "old"), row(1, "latest"), row(2, "other", "Radiology")], "user-a", now);
    expect(result.map(r => r.id)).toEqual(["latest", "other"]);
    expect(result[0]?.choices).toEqual({ 11: "B", 12: "A" });
  });
  it("never mixes reviews between signed-in users", () => {
    expect(latestReviews([row(1)], "user-b", now)).toEqual([]);
  });
});