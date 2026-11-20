import { supabase } from "@/integrations/supabase/client";
export const FEATURE_KEYS = ["qbanks", "image_questions", "test_mode", "bookmarks", "mistake_vault", "daily_blitz", "qotd", "reminders", "offline_downloads", "progress", "reviews", "checkout"] as const;
export type FeatureKey = typeof FEATURE_KEYS[number];
export function featureAvailable(rows: { key: string; enabled: boolean }[], key: FeatureKey, admin = false) { return admin || (rows.find(row => row.key === key)?.enabled ?? true); }
export async function fetchFeatures() {
  const { data, error } = await supabase.from("feature_settings").select("key,label,enabled,updated_at").order("label");
  if (error) throw error;
  return data ?? [];
}
