import { z } from "zod";
export const TRIAL_PRESETS = [7, 14, 21] as const;
export const DEFAULT_TRIAL_DAYS = 14;
export function trialCountdown(end: string, now = Date.now()) {
  const diff = Date.parse(end) - now;
  const seconds = Number.isFinite(diff) ? Math.max(0, Math.floor(diff / 1000)) : 0;
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds % 86400 / 3600), minutes: Math.floor(seconds % 3600 / 60), seconds: seconds % 60 };
}
export function downloadsAllowed(subscriptions: { is_trial: boolean; revoked: boolean; starts_at: string; ends_at: string }[], admin = false, now = Date.now()) { const active = subscriptions.filter(s => !s.revoked && Date.parse(s.starts_at) <= now && Date.parse(s.ends_at) > now); return admin || !active.some(s => s.is_trial) || active.some(s => !s.is_trial); }
export const trialSchema = z.object({ user: z.string().uuid(), plan: z.string().min(1), days: z.number().int().min(1).max(3650), start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(480) });
export function trialEnd(start: string, days: number) { const date = new Date(`${start}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
