DROP POLICY IF EXISTS "Read accessible study groups" ON public.study_groups;
CREATE POLICY "Read own or joined study groups" ON public.study_groups
FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_groups.id AND m.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.join_study_group(_code text)
RETURNS public.study_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE g public.study_groups;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT public.device_session_active() THEN RAISE EXCEPTION 'Device session not active'; END IF;
  SELECT * INTO g FROM public.study_groups WHERE invite_code = upper(trim(_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invite code.'; END IF;
  INSERT INTO public.study_group_members(group_id, user_id, role)
  VALUES (g.id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;
  RETURN g;
END;
$$;
REVOKE ALL ON FUNCTION public.join_study_group(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_study_group(text) TO authenticated;