-- Migration: Elixir Sanctuary, Notifications, To-Do List & Study Group Upgrades

-- 1. Notifications & Notification Reads
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = broadcast to all users
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'direct', 'alert')),
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON public.notification_reads(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notification_reads TO authenticated;

DROP POLICY IF EXISTS "Active device reads notifications" ON public.notifications;
CREATE POLICY "Active device reads notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.device_session_active() AND (
      recipient_id IS NULL OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "Active device reads notification_reads" ON public.notification_reads;
CREATE POLICY "Active device reads notification_reads" ON public.notification_reads
  FOR SELECT TO authenticated
  USING (
    public.device_session_active() AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Active device marks notification read" ON public.notification_reads;
CREATE POLICY "Active device marks notification read" ON public.notification_reads
  FOR INSERT TO authenticated
  WITH CHECK (
    public.device_session_active() AND user_id = auth.uid()
  );

-- Admin Send Notification RPC
CREATE OR REPLACE FUNCTION public.admin_send_notification(
  p_title text,
  p_message text,
  p_recipient_id uuid DEFAULT NULL,
  p_type text DEFAULT 'announcement',
  p_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  IF NOT public.device_session_active() THEN
    RAISE EXCEPTION 'Device session inactive';
  END IF;

  IF length(btrim(p_title)) < 2 OR length(p_title) > 200 THEN
    RAISE EXCEPTION 'Notification title must be between 2 and 200 characters';
  END IF;

  IF length(btrim(p_message)) < 2 OR length(p_message) > 2000 THEN
    RAISE EXCEPTION 'Notification message must be between 2 and 2000 characters';
  END IF;

  INSERT INTO public.notifications (created_by, recipient_id, title, message, type, link)
  VALUES (auth.uid(), p_recipient_id, btrim(p_title), btrim(p_message), coalesce(p_type, 'announcement'), p_link)
  RETURNING id INTO v_id;

  INSERT INTO public.admin_audit(actor_id, action, entity, record_key, changed_fields)
  VALUES (auth.uid(), 'create', 'notifications', v_id::text, jsonb_build_array('title', 'type', 'recipient_id'));

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_send_notification(text, text, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(text, text, uuid, text, text) TO authenticated;

-- 2. Fix Buddy Request RLS and RPC
ALTER TABLE public.buddies ALTER COLUMN requester_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Users send buddy requests" ON public.buddies;
CREATE POLICY "Users send buddy requests" ON public.buddies FOR INSERT TO authenticated
  WITH CHECK (
    public.device_session_active() AND
    auth.uid() = requester_id AND
    requester_id <> recipient_id
  );

CREATE OR REPLACE FUNCTION public.send_buddy_request(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req_id uuid;
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

  RETURN v_req_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_buddy_request(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.send_buddy_request(uuid) TO authenticated;

-- 3. Study To-Dos Table
CREATE TABLE IF NOT EXISTS public.study_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_todos_user ON public.study_todos(user_id, created_at DESC);

ALTER TABLE public.study_todos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.study_todos TO authenticated;

DROP POLICY IF EXISTS "Active device manages todos" ON public.study_todos;
CREATE POLICY "Active device manages todos" ON public.study_todos
  FOR ALL TO authenticated
  USING (public.device_session_active() AND user_id = auth.uid())
  WITH CHECK (public.device_session_active() AND user_id = auth.uid());

-- 4. Group Creator Remove Member Power RPC
CREATE OR REPLACE FUNCTION public.remove_study_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_creator uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.device_session_active() THEN
    RAISE EXCEPTION 'Device session inactive';
  END IF;

  SELECT created_by INTO v_creator FROM public.study_groups WHERE id = p_group_id;
  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'Study group not found';
  END IF;

  -- Allowed if user is group creator or user is removing themselves
  IF v_creator <> v_uid AND v_uid <> p_user_id THEN
    RAISE EXCEPTION 'Only the group creator can remove members';
  END IF;

  DELETE FROM public.study_group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_study_group_member(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.remove_study_group_member(uuid, uuid) TO authenticated;
