-- Migration: Library — Focus Timer, Apothecary, Buddies, Leaderboards & Study Groups
-- Features: Focus tracking, Apothecary rack, buddy relations, privacy controls, group rooms, chat, cheers

-- 1. Feature flag for Library in feature_settings
INSERT INTO public.feature_settings(key, label, enabled)
VALUES ('library', 'Library', true)
ON CONFLICT (key) DO NOTHING;

-- 2. Extended study profile columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle text UNIQUE,
  ADD COLUMN IF NOT EXISTS dream_specialisation text,
  ADD COLUMN IF NOT EXISTS todays_mood text,
  ADD COLUMN IF NOT EXISTS daily_focus_goal_minutes integer NOT NULL DEFAULT 240,
  ADD COLUMN IF NOT EXISTS study_hours_visibility text NOT NULL DEFAULT 'all_buddies';

-- Handle validation: lowercase alphanumeric and underscores, 3-30 chars
DO $$ BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_handle_format;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_handle_format CHECK (
    handle IS NULL OR handle ~* '^[a-z0-9_]{3,30}$'
  );
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_visibility_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_visibility_check CHECK (
    study_hours_visibility IN ('everyone', 'all_buddies', 'selected_buddies', 'hidden')
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Study Sessions table
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('stopwatch', 'pomodoro')),
  intent_note text,
  duration_seconds integer NOT NULL DEFAULT 0,
  target_seconds integer,
  status text NOT NULL CHECK (status IN ('completed', 'abandoned', 'running')),
  is_deep_focus boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON public.study_sessions(status);

-- 4. Buddies table
CREATE TABLE IF NOT EXISTS public.buddies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buddies_no_self CHECK (requester_id <> recipient_id),
  CONSTRAINT buddies_unique_pair UNIQUE (requester_id, recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_buddies_lookup ON public.buddies(requester_id, recipient_id, status);

-- 5. Study visibility allowlist (for 'selected_buddies')
CREATE TABLE IF NOT EXISTS public.study_visibility_allowlist (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, allowed_user_id)
);

-- 6. Study Groups table
CREATE TABLE IF NOT EXISTS public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  daily_goal_minutes integer NOT NULL DEFAULT 1800,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Study Group Members
CREATE TABLE IF NOT EXISTS public.study_group_members (
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.study_group_members(user_id);

-- 8. Study Group Messages
CREATE TABLE IF NOT EXISTS public.study_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON public.study_group_messages(group_id, created_at DESC);

-- 9. Study Cheers
CREATE TABLE IF NOT EXISTS public.study_cheers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cheers_recipient ON public.study_cheers(recipient_id, created_at DESC);

-- 10. Enable RLS on all new tables
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_visibility_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_cheers ENABLE ROW LEVEL SECURITY;

-- 11. Restrictive Device Session Policy on every new table
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'study_sessions',
    'buddies',
    'study_visibility_allowlist',
    'study_groups',
    'study_group_members',
    'study_group_messages',
    'study_cheers'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Active account device" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Active account device" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.device_session_active()) WITH CHECK (public.device_session_active())', t);
  END LOOP;
END $$;

-- 12. Permissive RLS Policies
-- study_sessions
CREATE POLICY "Users read own sessions" ON public.study_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own sessions" ON public.study_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own sessions" ON public.study_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- buddies
CREATE POLICY "Users view own buddy rows" ON public.buddies FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_id, recipient_id));
CREATE POLICY "Users send buddy requests" ON public.buddies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users update buddy requests" ON public.buddies FOR UPDATE TO authenticated
  USING (auth.uid() IN (requester_id, recipient_id)) WITH CHECK (auth.uid() IN (requester_id, recipient_id));
CREATE POLICY "Users delete buddy relationships" ON public.buddies FOR DELETE TO authenticated
  USING (auth.uid() IN (requester_id, recipient_id));

-- study_visibility_allowlist
CREATE POLICY "Owners manage allowlist" ON public.study_visibility_allowlist FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- study_groups
CREATE POLICY "Read accessible study groups" ON public.study_groups FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Create study groups" ON public.study_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update own study groups" ON public.study_groups FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.study_group_members m WHERE m.group_id = id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
  ));

-- study_group_members
CREATE POLICY "Read group members" ON public.study_group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_group_members.group_id AND m.user_id = auth.uid()));
CREATE POLICY "Join group" ON public.study_group_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leave or remove group members" ON public.study_group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_group_members.group_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
  ));

-- study_group_messages
CREATE POLICY "Read group messages" ON public.study_group_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_group_messages.group_id AND m.user_id = auth.uid()));
CREATE POLICY "Post group messages" ON public.study_group_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_group_messages.group_id AND m.user_id = auth.uid()));

-- study_cheers
CREATE POLICY "Read cheers" ON public.study_cheers FOR SELECT TO authenticated
  USING (auth.uid() IN (recipient_id, sender_id));
CREATE POLICY "Send cheer" ON public.study_cheers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- 13. Privacy and Leaderboard Security-Definer RPCs
CREATE OR REPLACE FUNCTION public.can_view_study_hours(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _vis text;
BEGIN
  IF _viewer = _target THEN RETURN true; END IF;
  SELECT study_hours_visibility INTO _vis FROM public.profiles WHERE id = _target;
  IF _vis IS NULL OR _vis = 'hidden' THEN RETURN false; END IF;
  IF _vis = 'everyone' THEN RETURN true; END IF;
  IF _vis = 'all_buddies' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.buddies
      WHERE status = 'accepted'
        AND ((requester_id = _viewer AND recipient_id = _target)
          OR (requester_id = _target AND recipient_id = _viewer))
    );
  END IF;
  IF _vis = 'selected_buddies' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.study_visibility_allowlist
      WHERE owner_id = _target AND allowed_user_id = _viewer
    );
  END IF;
  RETURN false;
END $$;

-- Safe buddy search: never exposes email or phone
CREATE OR REPLACE FUNCTION public.search_study_buddies(_query text)
RETURNS TABLE (
  id uuid,
  full_name text,
  handle text,
  college text,
  study_year text,
  avatar_url text,
  dream_specialisation text,
  todays_mood text,
  buddy_status text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean_q text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.device_session_active() THEN
    RAISE EXCEPTION 'Active session required';
  END IF;
  clean_q := btrim(_query);
  IF length(clean_q) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.handle,
    p.college,
    p.study_year,
    p.avatar_url,
    p.dream_specialisation,
    p.todays_mood,
    coalesce(
      (SELECT CASE
        WHEN b.status = 'accepted' THEN 'accepted'
        WHEN b.requester_id = auth.uid() THEN 'pending_sent'
        ELSE 'pending_received'
       END
       FROM public.buddies b
       WHERE (b.requester_id = auth.uid() AND b.recipient_id = p.id)
          OR (b.requester_id = p.id AND b.recipient_id = auth.uid())
       LIMIT 1),
      'none'
    ) AS buddy_status
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND (
      p.handle ILIKE '%' || clean_q || '%'
      OR p.full_name ILIKE '%' || clean_q || '%'
      OR p.college ILIKE '%' || clean_q || '%'
    )
  ORDER BY p.full_name ASC
  LIMIT 30;
END $$;

-- Leaderboard with IST calculation and privacy enforcement
CREATE OR REPLACE FUNCTION public.get_library_leaderboard(
  _period text,      -- 'daily' or 'weekly'
  _filter text,      -- 'global', 'college', 'year', 'buddies'
  _filter_val text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  handle text,
  college text,
  study_year text,
  avatar_url text,
  dream_specialisation text,
  todays_mood text,
  total_seconds bigint,
  rank integer,
  buddy_status text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _start_time timestamptz;
  _user_college text;
  _user_year text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.device_session_active() THEN
    RAISE EXCEPTION 'Active session required';
  END IF;

  SELECT p.college, p.study_year INTO _user_college, _user_year
  FROM public.profiles p WHERE p.id = auth.uid();

  IF _period = 'weekly' THEN
    -- Monday midnight IST
    _start_time := (date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata');
  ELSE
    -- Today midnight IST
    _start_time := ((now() AT TIME ZONE 'Asia/Kolkata')::date::timestamptz AT TIME ZONE 'Asia/Kolkata');
  END IF;

  RETURN QUERY
  WITH session_totals AS (
    SELECT
      s.user_id AS uid,
      sum(s.duration_seconds)::bigint AS secs
    FROM public.study_sessions s
    WHERE s.status = 'completed'
      AND s.started_at >= _start_time
    GROUP BY s.user_id
  ),
  eligible_users AS (
    SELECT
      p.id AS uid,
      p.full_name,
      p.handle,
      p.college,
      p.study_year,
      p.avatar_url,
      p.dream_specialisation,
      p.todays_mood,
      coalesce(st.secs, 0) AS secs,
      public.can_view_study_hours(auth.uid(), p.id) AS visible
    FROM public.profiles p
    JOIN session_totals st ON st.uid = p.id
    WHERE (
      _filter = 'global'
      OR (_filter = 'college' AND p.college = coalesce(_filter_val, _user_college))
      OR (_filter = 'year' AND p.study_year = coalesce(_filter_val, _user_year))
      OR (_filter = 'buddies' AND (
        p.id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.buddies b
          WHERE b.status = 'accepted'
            AND ((b.requester_id = auth.uid() AND b.recipient_id = p.id)
              OR (b.requester_id = p.id AND b.recipient_id = auth.uid()))
        )
      ))
    )
  ),
  ranked AS (
    SELECT
      e.uid,
      e.full_name,
      e.handle,
      e.college,
      e.study_year,
      e.avatar_url,
      e.dream_specialisation,
      e.todays_mood,
      e.secs,
      dense_rank() OVER (ORDER BY e.secs DESC)::integer AS rk
    FROM eligible_users e
    WHERE e.visible = true OR e.uid = auth.uid()
  )
  SELECT
    r.uid,
    r.full_name,
    r.handle,
    r.college,
    r.study_year,
    r.avatar_url,
    r.dream_specialisation,
    r.todays_mood,
    r.secs,
    r.rk,
    coalesce(
      (SELECT CASE
        WHEN b.status = 'accepted' THEN 'accepted'
        WHEN b.requester_id = auth.uid() THEN 'pending_sent'
        ELSE 'pending_received'
       END
       FROM public.buddies b
       WHERE (b.requester_id = auth.uid() AND b.recipient_id = r.uid)
          OR (b.requester_id = r.uid AND b.recipient_id = auth.uid())
       LIMIT 1),
      'none'
    ) AS buddy_status
  FROM ranked r
  ORDER BY r.rk ASC
  LIMIT 100;
END $$;
