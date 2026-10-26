import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  college: string | null;
  study_year: string | null;
  avatar_url: string | null;
  streak_goal: number;
  streak_target_days: number;
  last_celebrated_streak: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data as Profile;
  const { data: created, error: e2 } = await db.from("profiles").insert({ id: userId }).select("*").single();
  if (e2) throw e2;
  return created as Profile;
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await db.from("profiles").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) throw error;
}

export type DayRow = { day: string; questions: number; correct: number; seconds: number };
export async function fetchDaily(): Promise<DayRow[]> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { data, error } = await db.rpc("qb_daily_counts", { _tz: tz });
  if (error) throw error;
  return (data ?? []) as DayRow[];
}

export type SubjectStat = { subject: string; total: number; attempted: number; correct: number };
export async function fetchSubjectStats(): Promise<SubjectStat[]> {
  const { data, error } = await db.rpc("qb_subject_stats");
  if (error) throw error;
  return (data ?? []) as SubjectStat[];
}

export async function resetProgress(subject: string | null) {
  const { error } = await db.rpc("qb_reset", { _subject: subject });
  if (error) throw error;
}

/** Shrinks a picked photo to a 256px square JPEG data URL. */
export function photoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = 256;
      const c = document.createElement("canvas");
      c.width = s;
      c.height = s;
      const ctx = c.getContext("2d")!;
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
