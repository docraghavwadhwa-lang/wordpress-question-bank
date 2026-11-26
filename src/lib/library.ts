import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface StudySession {
  id: string;
  user_id: string;
  subject: string;
  mode: "stopwatch" | "pomodoro";
  intent_note: string | null;
  duration_seconds: number;
  target_seconds: number | null;
  status: "completed" | "abandoned" | "running";
  is_deep_focus: boolean;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface Buddy {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
  // joined profile info
  other_user?: undefined | {
    id: string;
    full_name: string | null;
    handle: string | null;
    college: string | null;
    study_year: string | null;
    avatar_url: string | null;
    dream_specialisation: string | null;
    todays_mood: string | null;
  };
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  handle: string | null;
  college: string | null;
  study_year: string | null;
  avatar_url: string | null;
  dream_specialisation: string | null;
  todays_mood: string | null;
  total_seconds: number;
  rank: number;
  buddy_status: "none" | "pending_sent" | "pending_received" | "accepted";
}

export interface StudyGroup {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  daily_goal_minutes: number;
  invite_code: string;
  created_at: string;
}

export interface StudyGroupMember {
  group_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    handle: string | null;
    avatar_url: string | null;
    college: string | null;
    study_year: string | null;
    dream_specialisation: string | null;
    todays_mood: string | null;
  };
  is_studying?: boolean;
  active_subject?: string | null;
  active_seconds?: number;
}

export interface StudyGroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  created_at: string;
  sender_handle?: string | null;
  sender_name?: string | null;
  sender_avatar?: string | null;
}

export interface StudyCheer {
  id: string;
  sender_id: string;
  recipient_id: string;
  reaction: string;
  created_at: string;
  sender_name?: string | null;
}

export async function fetchUserStudySessions(userId: string): Promise<StudySession[]> {
  const { data, error } = await db
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as StudySession[];
}

export async function createStudySession(payload: {
  userId: string;
  subject: string;
  mode: "stopwatch" | "pomodoro";
  intentNote?: string | undefined;
  targetSeconds?: number | undefined;
  isDeepFocus: boolean;
}): Promise<string> {
  const { data, error } = await db
    .from("study_sessions")
    .insert({
      user_id: payload.userId,
      subject: payload.subject,
      mode: payload.mode,
      intent_note: payload.intentNote?.trim() || null,
      target_seconds: payload.targetSeconds ?? null,
      status: "running",
      is_deep_focus: payload.isDeepFocus,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function completeStudySession(sessionId: string, durationSeconds: number) {
  const { error } = await db
    .from("study_sessions")
    .update({
      status: "completed",
      duration_seconds: durationSeconds,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function abandonStudySession(sessionId: string, durationSeconds: number) {
  const { error } = await db
    .from("study_sessions")
    .update({
      status: "abandoned",
      duration_seconds: durationSeconds,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function fetchUserBuddies(userId: string): Promise<Buddy[]> {
  const { data, error } = await db
    .from("buddies")
    .select("*")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  if (error) throw error;

  const buddies = (data ?? []) as Buddy[];
  if (!buddies.length) return [];

  const otherIds = buddies.map((b) => (b.requester_id === userId ? b.recipient_id : b.requester_id));
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, handle, college, study_year, avatar_url, dream_specialisation, todays_mood")
    .in("id", otherIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return buddies.map((b) => ({
    ...b,
    other_user: profileMap.get(b.requester_id === userId ? b.recipient_id : b.requester_id) as Buddy["other_user"],
  }));
}

export async function sendBuddyRequest(recipientId: string) {
  // Use audited SECURITY DEFINER RPC to bypass RLS insertion issues and enforce active device check
  const { data, error } = await (supabase as any).rpc("send_buddy_request", {
    target_user_id: recipientId,
  } as any);

  if (error) {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("Authentication required");

    const { error: insertErr } = await db.from("buddies").insert({
      requester_id: authData.user.id,
      recipient_id: recipientId,
      status: "pending",
    });
    if (insertErr) throw insertErr;
  }
  return data;
}

export async function respondBuddyRequest(requestId: string, status: "accepted" | "declined") {
  const { error } = await db
    .from("buddies")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
}

export async function removeBuddy(buddyId: string) {
  const { error } = await db.from("buddies").delete().eq("id", buddyId);
  if (error) throw error;
}

export async function searchBuddies(query: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await db.rpc("search_study_buddies", { _query: query });
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function fetchLeaderboard(
  period: "daily" | "weekly",
  filter: "global" | "college" | "year" | "buddies",
  filterVal?: string
): Promise<LeaderboardEntry[]> {
  const { data, error } = await db.rpc("get_library_leaderboard", {
    _period: period,
    _filter: filter,
    _filter_val: filterVal || null,
  });
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function fetchUserGroups(userId: string): Promise<StudyGroup[]> {
  const { data: memberships, error: mErr } = await db
    .from("study_group_members")
    .select("group_id")
    .eq("user_id", userId);
  if (mErr) throw mErr;
  if (!memberships || !memberships.length) return [];

  const groupIds = memberships.map((m: any) => m.group_id);
  const { data: groups, error: gErr } = await db
    .from("study_groups")
    .select("*")
    .in("id", groupIds);
  if (gErr) throw gErr;
  return (groups ?? []) as StudyGroup[];
}

export async function createStudyGroup(payload: {
  userId: string;
  name: string;
  description?: string;
  dailyGoalMinutes: number;
}): Promise<StudyGroup> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: group, error: gErr } = await db
    .from("study_groups")
    .insert({
      created_by: payload.userId,
      name: payload.name,
      description: payload.description || null,
      daily_goal_minutes: payload.dailyGoalMinutes,
      invite_code: code,
    })
    .select("*")
    .single();
  if (gErr) throw gErr;

  // Add creator as owner
  await db.from("study_group_members").insert({
    group_id: group.id,
    user_id: payload.userId,
    role: "owner",
  });

  return group as StudyGroup;
}

export async function joinStudyGroupByCode(code: string, _userId: string): Promise<StudyGroup> {
  const cleanCode = code.trim().toUpperCase();
  const { data: group, error: gErr } = await db.rpc("join_study_group", { _code: cleanCode });
  if (gErr || !group) throw new Error("Invalid or expired invite code.");
  return group as StudyGroup;
}

export async function fetchGroupMembers(groupId: string): Promise<StudyGroupMember[]> {
  const { data: members, error } = await db
    .from("study_group_members")
    .select("group_id, user_id, role, joined_at")
    .eq("group_id", groupId);
  if (error) throw error;
  if (!members || !members.length) return [];

  const userIds = members.map((m: any) => m.user_id);
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, handle, avatar_url, college, study_year, dream_specialisation, todays_mood")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  // Also query active sessions within the last 30 minutes
  const recentThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: activeSessions } = await db
    .from("study_sessions")
    .select("user_id, subject, started_at, duration_seconds")
    .in("user_id", userIds)
    .eq("status", "running")
    .gte("started_at", recentThreshold);

  interface ActiveSessionRow {
    user_id: string;
    subject: string;
    started_at: string;
    duration_seconds: number;
  }
  const sessionMap = new Map<string, ActiveSessionRow>(
    (activeSessions ?? []).map((s: any) => [s.user_id, s as ActiveSessionRow])
  );

  return members.map((m: any) => {
    const s = sessionMap.get(m.user_id);
    const elapsed = s ? Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000) : 0;
    return {
      ...m,
      profile: profileMap.get(m.user_id),
      is_studying: !!s,
      active_subject: s?.subject || null,
      active_seconds: elapsed,
    };
  });
}

export async function fetchGroupMessages(groupId: string): Promise<StudyGroupMessage[]> {
  const { data: msgs, error } = await db
    .from("study_group_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  if (!msgs || !msgs.length) return [];

  const userIds = Array.from(new Set(msgs.map((m: any) => m.user_id)));
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, handle, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return msgs.map((m: any) => {
    const p = profileMap.get(m.user_id) as any;
    return {
      ...m,
      sender_handle: p?.handle || null,
      sender_name: p?.full_name || null,
      sender_avatar: p?.avatar_url || null,
    };
  });
}

export async function sendGroupMessage(groupId: string, userId: string, message: string) {
  const { error } = await db.from("study_group_messages").insert({
    group_id: groupId,
    user_id: userId,
    message: message.trim(),
  });
  if (error) throw error;
}

export async function sendStudyCheer(recipientId: string, reaction: string) {
  const { error } = await db.from("study_cheers").insert({
    recipient_id: recipientId,
    reaction,
  });
  if (error) throw error;
}


export async function removeStudyGroupMember(groupId: string, userId: string) {
  const { error } = await (supabase as any).rpc("remove_study_group_member", {
    p_group_id: groupId,
    p_user_id: userId,
  } as any);

  if (error) {
    const { error: delErr } = await db
      .from("study_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (delErr) throw delErr;
  }
}

export interface StudyTodo {
  id: string;
  user_id: string;
  task: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

const LOCAL_TODOS_KEY = "elixir_study_todos_v1";

export async function fetchStudyTodos(userId: string): Promise<StudyTodo[]> {
  try {
    const { data, error } = await db
      .from("study_todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(data));
      }
      return data as StudyTodo[];
    }
  } catch (e) {
    console.error("fetchStudyTodos network error:", e);
  }

  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_TODOS_KEY);
      if (local) return JSON.parse(local);
    } catch {
      /* ignore */
    }
  }
  return [];
}

export async function addStudyTodo(userId: string, task: string): Promise<StudyTodo> {
  const newTodo: StudyTodo = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    user_id: userId,
    task: task.trim(),
    completed: false,
    completed_at: null,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await db
      .from("study_todos")
      .insert({
        id: newTodo.id,
        user_id: userId,
        task: newTodo.task,
        completed: false,
      })
      .select()
      .single();

    if (!error && data) return data as StudyTodo;
  } catch {
    /* fallback to local */
  }

  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_TODOS_KEY);
      const list: StudyTodo[] = local ? JSON.parse(local) : [];
      list.unshift(newTodo);
      localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }

  return newTodo;
}

export async function toggleStudyTodo(todoId: string, completed: boolean) {
  try {
    await db.from("study_todos").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", todoId);
  } catch {
    /* fallback */
  }

  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_TODOS_KEY);
      if (local) {
        const list: StudyTodo[] = JSON.parse(local);
        const updated = list.map((t) =>
          t.id === todoId ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t
        );
        localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(updated));
      }
    } catch {
      /* ignore */
    }
  }
}

export async function deleteStudyTodo(todoId: string) {
  try {
    await db.from("study_todos").delete().eq("id", todoId);
  } catch {
    /* fallback */
  }

  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_TODOS_KEY);
      if (local) {
        const list: StudyTodo[] = JSON.parse(local);
        const updated = list.filter((t) => t.id !== todoId);
        localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(updated));
      }
    } catch {
      /* ignore */
    }
  }
}
