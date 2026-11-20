import { describe, expect, it } from "vitest";
import { COURSES, ONBOARDING_STEPS, completionKey, needsOnboarding, onboardingSchema } from "./onboarding";

describe("First-sign-in setup rules", () => {
  it("offers MBBS First through Fourth year only", () => {
    expect([...COURSES]).toEqual(["MBBS - First year", "MBBS - Second year", "MBBS - Third year", "MBBS - Fourth year"]);
  });
  it("collects course, college, then phone in that order", () => {
    expect([...ONBOARDING_STEPS]).toEqual(["course", "college", "phone"]);
  });
  it("does not ask again once completion is saved", () => {
    expect(needsOnboarding(null)).toBe(true);
    expect(needsOnboarding("2026-11-20T06:02:00Z")).toBe(false);
  });
  it("requires all college details and phone", () => {
    const complete = { course: "MBBS - First year", college: "Medical College", state: "Delhi", admissionYear: 2026, phone: "+919876543210" };
    expect(onboardingSchema.safeParse(complete).success).toBe(true);
    for (const key of ["course", "college", "state", "admissionYear", "phone"] as const) {
      expect(onboardingSchema.safeParse({ ...complete, [key]: undefined }).success).toBe(false);
    }
    expect(onboardingSchema.safeParse({ ...complete, phone: "123" }).success).toBe(false);
  });
  it("keeps completion cache separate between users", () => {
    expect(completionKey("student-a")).not.toBe(completionKey("student-b"));
  });
});