import { trialSchema } from "./trials";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "./native-auth";
import type { Database } from "@/integrations/supabase/types";

export type Plan = Database["public"]["Tables"]["subscription_plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export const customAccessSchema = z.object({ user: z.string().uuid(), plan: z.string().min(1), months: z.number().int().min(1).max(36), start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), amount: z.number().int().min(0).max(2147483647), note: z.string().max(500) });
export const PURCHASE_STAGES = { plans_viewed: "Viewed plans", coupon_page: "Choosing a coupon", payment_page: "Reached payment page", payment_opened: "Opened payment", payment_cancelled: "Closed payment", payment_failed: "Payment failed", verification_pending: "Awaiting verification" } as const;
export type PurchaseStage = keyof typeof PURCHASE_STAGES;
export function stageLabel(stage: string | null) { return stage ? PURCHASE_STAGES[stage as PurchaseStage] ?? stage : "No purchase activity"; }
export async function trackPurchase(stage: PurchaseStage, plan?: string, months?: number) {
  const { error } = await supabase.rpc("track_purchase_stage", { _stage: stage, ...(plan ? { _plan: plan } : {}), ...(months ? { _months: months } : {}), _platform: isNativeApp() ? "android" : "web" });
  if (error) throw error;
}
export async function consoleUsers(search = "", offset = 0, journeys = false) {
  const { data, error } = await supabase.rpc("admin_console_users", { _search: search, _offset: offset, _journeys: journeys }); if (error) throw error; return data ?? [];
}
export async function allPlans() { const { data, error } = await supabase.rpc("admin_all_plans"); if (error) throw error; return data ?? []; }
export async function allocateTrial(input: z.input<typeof trialSchema>, subscription?: string) { const d = trialSchema.parse(input); const { error } = await supabase.rpc("admin_allocate_trial", { _user: d.user, _plan: d.plan, _days: d.days, _start: d.start, _note: d.note, ...(subscription ? { _subscription: subscription } : {}) }); if (error) throw error; }
export async function allocateCustom(input: z.input<typeof customAccessSchema>, request?: string) {
  const d = customAccessSchema.parse(input);
  const { error } = await supabase.rpc("admin_allocate_access", { _user: d.user, _plan: d.plan, _months: d.months, _start: d.start, _amount: d.amount, _note: d.note, ...(request ? { _request: request } : {}) }); if (error) throw error;
}
const detailSchema = z.object({ email: z.string(), profile: z.object({ id: z.string(), full_name: z.string().nullable(), phone: z.string().nullable(), study_year: z.string().nullable(), college: z.string().nullable(), college_state: z.string().nullable(), admission_year: z.number().nullable(), created_at: z.string() }), attempts: z.number(), correct: z.number(), bookmarks: z.number(), devices: z.array(z.object({ device_name: z.string(), updated_at: z.string() })), journey: z.array(z.object({ id: z.string(), stage: z.string(), plan_id: z.string().nullable(), months: z.number().nullable(), platform: z.string(), created_at: z.string() })), payments: z.array(z.object({ id: z.string(), plan_id: z.string(), total_paise: z.number(), status: z.string(), created_at: z.string() })), subscriptions: z.array(z.object({ id: z.string(), plan_id: z.string(), starts_at: z.string(), ends_at: z.string(), revoked: z.boolean(), amount_paid_paise: z.number().nullable() })) });
export async function studentDetail(id: string) { const { data, error } = await supabase.rpc("admin_user_detail", { _user: id }); if (error) throw error; return detailSchema.parse(data); }
