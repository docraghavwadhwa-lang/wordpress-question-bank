import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface NotificationItem {
  id: string;
  created_by: string | null;
  recipient_id: string | null;
  title: string;
  message: string;
  type: "announcement" | "direct" | "alert";
  link: string | null;
  created_at: string;
  is_read?: boolean;
}

export async function fetchUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    // 1. Fetch user notifications (broadcasts where recipient_id IS NULL or direct messages for this user)
    const { data: notifs, error } = await db
      .from("notifications")
      .select("*")
      .or(`recipient_id.is.null,recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // If table doesn't exist yet, return empty list gracefully
      return [];
    }

    if (!notifs || notifs.length === 0) return [];

    // 2. Fetch read statuses
    const { data: reads } = await db
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId);

    const readSet = new Set((reads || []).map((r: { notification_id: string }) => r.notification_id));

    return notifs.map((n: NotificationItem) => ({
      ...n,
      is_read: readSet.has(n.id),
    }));
  } catch (err) {
    console.error("fetchUserNotifications error:", err);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const { error } = await db.from("notification_reads").upsert(
    {
      notification_id: notificationId,
      user_id: userId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "notification_id,user_id" }
  );
  if (error) throw error;
}

export async function markAllNotificationsAsRead(notificationIds: string[], userId: string) {
  if (notificationIds.length === 0) return;
  const rows = notificationIds.map((id) => ({
    notification_id: id,
    user_id: userId,
    read_at: new Date().toISOString(),
  }));
  const { error } = await db.from("notification_reads").upsert(rows, {
    onConflict: "notification_id,user_id",
  });
  if (error) throw error;
}

export async function adminSendNotification(params: {
  title: string;
  message: string;
  recipient_id?: string | null;
  type?: "announcement" | "direct" | "alert";
  link?: string | null;
}) {
  const { data, error } = await (supabase as any).rpc("admin_send_notification", {
    p_title: params.title.trim(),
    p_message: params.message.trim(),
    p_recipient_id: params.recipient_id || null,
    p_type: params.type || "announcement",
    p_link: params.link?.trim() || null,
  } as any);

  if (error) {
    // If RPC is missing or fails, attempt direct insert
    const { data: directData, error: directErr } = await db
      .from("notifications")
      .insert({
        title: params.title.trim(),
        message: params.message.trim(),
        recipient_id: params.recipient_id || null,
        type: params.type || "announcement",
        link: params.link?.trim() || null,
      })
      .select("id")
      .single();

    if (directErr) throw error;
    return directData?.id;
  }

  return data;
}

export async function fetchAdminDispatchedNotifications() {
  const { data, error } = await db
    .from("notifications")
    .select("*, profiles!created_by(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return [];
  return data || [];
}

// -------------------------------------------------------------
// Admin-Configurable Same-College Notification Interval Settings
// -------------------------------------------------------------

export async function getHomieRecommendationIntervalDays(): Promise<number> {
  try {
    const { data } = await db
      .from("feature_settings")
      .select("label")
      .eq("key", "homie_recommendation_interval_days")
      .maybeSingle();

    if (data?.label) {
      const val = parseInt(data.label, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    /* fallback to local storage */
  }
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("elixir_homie_rec_interval_days");
    return local ? parseInt(local, 10) || 2 : 2;
  }
  return 2;
}

export async function setHomieRecommendationIntervalDays(days: number) {
  const d = Math.max(1, Math.min(30, days));
  try {
    await db.from("feature_settings").upsert({
      key: "homie_recommendation_interval_days",
      label: String(d),
      enabled: true,
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("elixir_homie_rec_interval_days", String(d));
  }
}

// -------------------------------------------------------------
// Automated Background Notification Checks
// -------------------------------------------------------------

export async function checkPeriodicSameCollegeNotification(userId: string) {
  if (!userId) return;
  try {
    const { data: profile } = await db
      .from("profiles")
      .select("college, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.college || !profile.college.trim()) return;
    const college = profile.college.trim();

    // Check when user last received this recommendation notification
    const { data: pastNotifs } = await db
      .from("notifications")
      .select("created_at")
      .eq("recipient_id", userId)
      .eq("title", "🎓 Your Batchmates Are Locked In!")
      .order("created_at", { ascending: false })
      .limit(1);

    const intervalDays = await getHomieRecommendationIntervalDays();
    if (pastNotifs && pastNotifs.length > 0) {
      const lastSent = new Date(pastNotifs[0].created_at).getTime();
      const diffDays = (Date.now() - lastSent) / (1000 * 60 * 60 * 24);
      if (diffDays < intervalDays) return;
    }

    // Check if eligible peers from same college exist who are not homies yet
    const { data: buddies } = await db
      .from("buddies")
      .select("requester_id, recipient_id")
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

    const existingBuddyIds = new Set<string>();
    existingBuddyIds.add(userId);
    (buddies || []).forEach((b: { requester_id: string; recipient_id: string }) => {
      existingBuddyIds.add(b.requester_id);
      existingBuddyIds.add(b.recipient_id);
    });

    const { data: peers } = await db
      .from("profiles")
      .select("id")
      .ilike("college", college)
      .limit(20);

    const unaddedPeers = (peers || []).filter((p: { id: string }) => !existingBuddyIds.has(p.id));
    if (unaddedPeers.length === 0) return;

    // Send the notification
    await db.from("notifications").insert({
      recipient_id: userId,
      title: "🎓 Your Batchmates Are Locked In!",
      message: `Students from ${college} are studying in Elixir Sanctuary right now. Tap to add your Homies and crush your daily goals together 🔥`,
      type: "direct",
      link: "/library?tab=buddies",
    });
  } catch (err) {
    console.warn("checkPeriodicSameCollegeNotification error:", err);
  }
}

export async function checkTrialEndingNotification(userId: string) {
  if (!userId) return;
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data: subs } = await db
      .from("subscriptions")
      .select("id, ends_at, revoked")
      .eq("user_id", userId)
      .eq("revoked", false)
      .gt("ends_at", now.toISOString())
      .lte("ends_at", threeDaysLater.toISOString());

    if (!subs || subs.length === 0) return;

    // Check if already notified
    const { data: pastNotifs } = await db
      .from("notifications")
      .select("id")
      .eq("recipient_id", userId)
      .eq("title", "⏳ Your Elixir Trial is Ending Soon")
      .limit(1);

    if (pastNotifs && pastNotifs.length > 0) return;

    await db.from("notifications").insert({
      recipient_id: userId,
      title: "⏳ Your Elixir Trial is Ending Soon",
      message:
        "Don't break your streak! Your trial is almost over—get in touch with our team today to keep your Q-bank and Sanctuary access uninterrupted 🚀",
      type: "alert",
      link: "/plans",
    });
  } catch (err) {
    console.warn("checkTrialEndingNotification error:", err);
  }
}

export async function fetchUsersExpiringWithinThreeDays(): Promise<{ id: string; name: string; email: string; ends_at: string }[]> {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data: subs } = await db
      .from("subscriptions")
      .select("user_id, ends_at, profiles!user_id(full_name, email)")
      .eq("revoked", false)
      .gt("ends_at", now.toISOString())
      .lte("ends_at", threeDaysLater.toISOString())
      .limit(50);

    if (!subs) return [];
    return subs.map((s: any) => ({
      id: s.user_id,
      name: s.profiles?.full_name || "Doctor",
      email: s.profiles?.email || "",
      ends_at: s.ends_at,
    }));
  } catch (err) {
    console.error("fetchUsersExpiringWithinThreeDays error:", err);
    return [];
  }
}
