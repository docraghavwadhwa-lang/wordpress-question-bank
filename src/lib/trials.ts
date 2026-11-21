import { z } from "zod";
export const TRIAL_PRESETS = [7, 14, 21] as const;
export const trialSchema = z.object({ user: z.string().uuid(), plan: z.string().min(1), days: z.number().int().min(1).max(3650), start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(480) });
export function trialEnd(start: string, days: number) { const date = new Date(`${start}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
