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
    // If RPC is missing, attempt direct insert
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
