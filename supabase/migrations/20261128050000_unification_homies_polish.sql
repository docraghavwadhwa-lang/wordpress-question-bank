-- Migration: Unification, Homies Directory RLS, Notifications, Study Together Invites & Account Deletion

-- 1. Allow authenticated students with active device sessions to read directory profiles (names, handles, avatars, colleges)
DROP POLICY IF EXISTS "Public profile directory read" ON public.profiles;
CREATE POLICY "Public profile directory read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.device_session_active());

-- 2. Allow authenticated students to insert direct notifications to peers
GRANT INSERT ON public.notifications TO authenticated;
DROP POLICY IF EXISTS "Authenticated users send direct notification" ON public.notifications;
CREATE POLICY "Authenticated users send direct notification" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.device_session_active() AND
    created_by = auth.uid() AND
    recipient_id IS NOT NULL AND
    recipient_id <> auth.uid() AND
    type = 'direct'
  );

-- 3. Update send_buddy_request to automatically insert a notification
CREATE OR REPLACE FUNCTION public.send_buddy_request(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req_id uuid;
  v_sender_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.device_session_active() THEN
    RAISE EXCEPTION 'Device session inactive';
  END IF;
  IF v_uid = target_user_id THEN
    RAISE EXCEPTION 'Cannot add yourself as a buddy';
  END IF;

  INSERT INTO public.buddies (requester_id, recipient_id, status)
  VALUES (v_uid, target_user_id, 'pending')
  ON CONFLICT (requester_id, recipient_id)
  DO UPDATE SET status = CASE WHEN buddies.status = 'declined' THEN 'pending' ELSE buddies.status END,
                updated_at = now()
  RETURNING id INTO v_req_id;

  -- Lookup sender display name
  SELECT coalesce(nullif(btrim(full_name), ''), nullif(btrim(handle), ''), 'A fellow doctor')
  INTO v_sender_name
  FROM public.profiles
  WHERE id = v_uid;

  -- Insert notification for recipient
  INSERT INTO public.notifications (created_by, recipient_id, title, message, type, link)
  VALUES (
    v_uid,
    target_user_id,
    '🤝 New Homie Request!',
    '✨ ' || coalesce(v_sender_name, 'A fellow doctor') || ' wants to lock in and study together! Tap to accept and keep each other accountable 🎯',
    'direct',
    '/homies'
  );

  RETURN v_req_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_buddy_request(uuid) TO authenticated;

-- 4. Study Together Invites Table & RPC
CREATE TABLE IF NOT EXISTS public.study_together_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  group_code text NOT NULL,
  group_name text NOT NULL,
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_together_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own study together invites" ON public.study_together_invites;
CREATE POLICY "Users can read their own study together invites" ON public.study_together_invites
  FOR SELECT TO authenticated
  USING (
    public.device_session_active() AND
    (recipient_id = auth.uid() OR inviter_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update invites sent to them" ON public.study_together_invites;
CREATE POLICY "Users can update invites sent to them" ON public.study_together_invites
  FOR UPDATE TO authenticated
  USING (
    public.device_session_active() AND
    recipient_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can insert study invites" ON public.study_together_invites;
CREATE POLICY "Users can insert study invites" ON public.study_together_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.device_session_active() AND
    inviter_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.send_study_together_invite(p_group_id uuid, p_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sender_name text;
  v_group_name text;
  v_code text;
  v_invite_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.device_session_active() THEN
    RAISE EXCEPTION 'Device session inactive';
  END IF;
  IF v_uid = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot invite yourself';
  END IF;

  SELECT name, invite_code INTO v_group_name, v_code FROM public.study_groups WHERE id = p_group_id;
  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Study room not found';
  END IF;

  SELECT coalesce(nullif(btrim(full_name), ''), nullif(btrim(handle), ''), 'Your Homie')
  INTO v_sender_name
  FROM public.profiles
  WHERE id = v_uid;

  -- Insert record into study_together_invites
  INSERT INTO public.study_together_invites (group_id, group_code, group_name, inviter_id, recipient_id, status)
  VALUES (p_group_id, v_code, v_group_name, v_uid, p_target_user_id, 'pending')
  RETURNING id INTO v_invite_id;

  -- Insert notification into notifications bell for recipient
  INSERT INTO public.notifications (created_by, recipient_id, title, message, type, link)
  VALUES (
    v_uid,
    p_target_user_id,
    '👥 Study Together Invitation',
    'Your Homie ' || coalesce(v_sender_name, 'A doctor') || ' has invited you to Study Together.',
    'direct',
    '/homies'
  );

  RETURN v_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_study_together_invite(uuid, uuid) TO authenticated;

-- 5. User Account Deletion Database Cleanup RPC
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_service boolean := (coalesce(current_setting('role', true), '') = 'service_role');
BEGIN
  IF NOT v_is_service THEN
    IF v_caller IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF v_caller <> target_user_id AND NOT public.has_role(v_caller, 'admin') THEN
      RAISE EXCEPTION 'Unauthorized to delete this account';
    END IF;
  END IF;

  -- Cascade deletes across application tables
  DELETE FROM public.study_together_invites WHERE inviter_id = target_user_id OR recipient_id = target_user_id;
  DELETE FROM public.study_group_members WHERE user_id = target_user_id;
  DELETE FROM public.study_group_messages WHERE user_id = target_user_id;
  DELETE FROM public.buddies WHERE requester_id = target_user_id OR recipient_id = target_user_id;
  DELETE FROM public.study_visibility_allowlist WHERE user_id = target_user_id OR buddy_id = target_user_id;
  DELETE FROM public.study_cheers WHERE recipient_id = target_user_id;
  DELETE FROM public.study_todos WHERE user_id = target_user_id;
  DELETE FROM public.study_sessions WHERE user_id = target_user_id;
  DELETE FROM public.notification_reads WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE created_by = target_user_id OR recipient_id = target_user_id;
  DELETE FROM public.account_devices WHERE user_id = target_user_id;
  DELETE FROM public.attempts WHERE user_id = target_user_id;
  DELETE FROM public.bookmarks WHERE user_id = target_user_id;
  DELETE FROM public.quiz_reviews WHERE user_id = target_user_id;
  DELETE FROM public.blitz_results WHERE user_id = target_user_id;
  DELETE FROM public.trial_requests WHERE user_id = target_user_id;
  DELETE FROM public.trial_activity WHERE user_id = target_user_id;
  DELETE FROM public.payment_requests WHERE user_id = target_user_id;
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;
