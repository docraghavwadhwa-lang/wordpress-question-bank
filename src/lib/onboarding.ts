import { z } from "zod";

export const COURSES = ["MBBS - First year", "MBBS - Second year", "MBBS - Third year", "MBBS - Fourth year", "Housemanship / Internship", "Post MBBS"] as const;
export const ONBOARDING_STEPS = ["course", "college", "phone"] as const;
export const COLLEGE_STATES = ["Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Outside India"] as const;

export const collegeSchema = z.object({
  college: z.string().trim().min(2, "Enter your college name.").max(150).regex(/^[^<>\x00-\x1f]+$/, "Enter a valid college name.").transform(v => v.replace(/\s+/g, " ")),
  state: z.enum(COLLEGE_STATES),
  admissionYear: z.number().int().min(2000).refine(v => v <= new Date().getFullYear(), "Choose a valid admission year."),
});
export const phoneSchema = z.string().transform(v => v.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\+[1-9]\d{9,14}$/, "Enter a valid phone number with country code."));
export const onboardingSchema = collegeSchema.extend({ course: z.enum(COURSES), phone: phoneSchema });
export type OnboardingDetails = z.infer<typeof onboardingSchema>;
export function needsOnboarding(completedAt: string | null | undefined) { return !completedAt; }

/** Only a completion flag is cached; never cache phone or college details. */
export function completionKey(userId: string) { return `elixir:onboarding-complete:${userId}`; }