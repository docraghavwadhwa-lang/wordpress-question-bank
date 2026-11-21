import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
export async function fetchTrialRequest(user: string) { const { data, error } = await supabase.from("trial_requests").select("*").eq("user_id", user).maybeSingle(); if (error) throw error; return data; }
export async function requestTrial() { const { error } = await supabase.rpc("request_trial"); if (error) throw error; }
export async function fetchTrialRequests() { const { data, error } = await supabase.from("trial_requests").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data ?? []; }
const engagement = z.object({ visits: z.array(z.object({ day: z.string(), last_seen_at: z.string() })), questions: z.number(), correct: z.number() });
export async function fetchTrialEngagement(user: string) { const { data, error } = await supabase.rpc("admin_trial_engagement", { _user: user }); if (error) throw error; return engagement.parse(data); }