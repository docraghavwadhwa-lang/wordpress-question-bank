import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const manualPaymentUpiId = "docraghavwadhwa-1@okicici";
export const couponSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/), percent: z.number().int().min(1).max(100), enabled: z.boolean() });
export const allocationSchema = z.object({ months: z.number().int().min(1).max(36), start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export function freeQuestionCount(total: number) { return Math.floor(total * 0.1); }
export function discountedPrice(paise: number, percent: number) { return Math.round(paise * (100 - percent) / 100); }
export function allocationEnd(start: string, months: number) {
  const date = new Date(`${start}T00:00:00Z`);
  const day = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last)); return date.toISOString().slice(0, 10);
}
export function subscriptionActive(s: { starts_at: string; ends_at: string; revoked: boolean }, now = Date.now()) { return !s.revoked && Date.parse(s.starts_at) <= now && Date.parse(s.ends_at) > now; }
export const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
export const dateLabel = (date: string) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export async function fetchPlans() { const { data, error } = await supabase.from("subscription_plans").select("*").order("price_year"); if (error) throw error; return data ?? []; }
export async function fetchPlanSubjects() { const { data, error } = await supabase.from("plan_subjects").select("*"); if (error) throw error; return data ?? []; }
/** Subjects the user has no active subscription for; their paid questions stay locked (10% of each subject stays free). */
export function lockedSubjects(subscriptions: { plan_id: string; starts_at: string; ends_at: string; revoked: boolean }[], planSubjects: { plan_id: string; subject: string }[], subjects: string[], now = Date.now()) {
  const covered = new Set(planSubjects.filter(ps => subscriptions.some(s => s.plan_id === ps.plan_id && subscriptionActive(s, now))).map(ps => ps.subject));
  return new Set(subjects.filter(s => !covered.has(s)));
}
export async function fetchAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { admin: false, subscriptions: [] };
  const [roles, subs] = await Promise.all([supabase.from("user_roles").select("role").eq("user_id", session.user.id), supabase.from("subscriptions").select("*").eq("user_id", session.user.id).order("ends_at", { ascending: false })]);
  if (roles.error) throw roles.error; if (subs.error) throw subs.error;
  return { admin: roles.data.some(r => r.role === "admin"), subscriptions: subs.data };
}
export async function fetchPayments() { const { data, error } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data ?? []; }
export async function quotePlan(plan: string, months: number, coupon: string) { const { data, error } = await supabase.rpc("quote_plan", { _plan: plan, _months: months, _coupon: coupon }); if (error) throw error; const quote = data?.[0]; if (!quote) throw new Error("Quote unavailable"); return quote; }
export async function submitPayment(plan: string, months: number, coupon: string, reference: string) { const { error } = await supabase.rpc("submit_payment_request", { _plan: plan, _months: months, _coupon: coupon, _reference: reference }); if (error) throw error; }
export async function fetchStudents(search = "", offset = 0) { const { data, error } = await supabase.rpc("admin_students", { _search: search, _offset: offset }); if (error) throw error; return data ?? []; }
export async function approveAccess(user: string, plan: string, months: number, start: string, request?: string) { allocationSchema.parse({ months, start }); const { error } = await supabase.rpc("approve_subscription", { _user: user, _plan: plan, _months: months, _start: start, ... (request ? { _request: request } : {}) }); if (error) throw error; }
export async function fetchCoupons() { const { data, error } = await supabase.from("discount_coupons").select("*").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; }
export async function saveCoupon(input: z.input<typeof couponSchema>) { const coupon = couponSchema.parse(input); const { error } = await supabase.from("discount_coupons").upsert(coupon); if (error) throw error; }