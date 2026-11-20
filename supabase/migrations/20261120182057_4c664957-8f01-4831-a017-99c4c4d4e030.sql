CREATE OR REPLACE FUNCTION public.accessible_subjects()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin'::app_role)
    THEN (SELECT coalesce(array_agg(DISTINCT subject), '{}') FROM public.decks)
    ELSE (SELECT coalesce(array_agg(DISTINCT ps.subject), '{}') FROM public.subscriptions s JOIN public.plan_subjects ps ON ps.plan_id=s.plan_id
          WHERE s.user_id=auth.uid() AND NOT s.revoked AND s.starts_at<=now() AND s.ends_at>now()) END
$$;
REVOKE ALL ON FUNCTION public.accessible_subjects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accessible_subjects() TO authenticated;

ALTER POLICY "Active account device" ON public.questions USING ((SELECT public.device_session_active()));
ALTER POLICY "Student free or subscribed" ON public.questions USING (is_free OR subject = ANY ((SELECT public.accessible_subjects())::text[]));