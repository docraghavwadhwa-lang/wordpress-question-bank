DROP POLICY "Feature availability" ON public.feature_settings;
CREATE POLICY "Administrator feature read" ON public.feature_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE SELECT ON public.feature_settings FROM anon;

CREATE OR REPLACE FUNCTION public.public_feature_availability()
RETURNS TABLE(key text, label text, enabled boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.key, f.label, f.enabled, f.updated_at
  FROM public.feature_settings f
  WHERE f.key IN ('qbanks','image_questions','test_mode','bookmarks','mistake_vault','daily_blitz','qotd','reminders','offline_downloads','progress','reviews','checkout')
  ORDER BY f.label
$$;
REVOKE ALL ON FUNCTION public.public_feature_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_feature_availability() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.public_feature_availability() IS 'Public read-only projection of known UI feature availability; excludes administrator identity and internal settings.';

CREATE OR REPLACE FUNCTION public.feature_enabled(_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT coalesce((SELECT f.enabled FROM public.public_feature_availability() f WHERE f.key = _key), true)
$$;
REVOKE ALL ON FUNCTION public.feature_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feature_enabled(text) TO anon, authenticated, service_role;

DO $$
DECLARE expected_count integer; visible_count integer; flag record;
BEGIN
 SELECT count(*) INTO expected_count FROM public.public_feature_availability();
 EXECUTE 'SET LOCAL ROLE anon';
 BEGIN
   PERFORM updated_by FROM public.feature_settings;
   RAISE EXCEPTION 'Guest unexpectedly read internal feature settings';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 SELECT count(*) INTO visible_count FROM public.public_feature_availability();
 IF visible_count <> expected_count THEN RAISE EXCEPTION 'Guest feature availability changed'; END IF;
 FOR flag IN SELECT * FROM public.public_feature_availability() LOOP
   IF public.feature_enabled(flag.key) IS DISTINCT FROM flag.enabled THEN RAISE EXCEPTION 'Guest feature enforcement mismatch'; END IF;
 END LOOP;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claims', '{"role":"authenticated"}', true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 SELECT count(*) INTO visible_count FROM public.feature_settings;
 IF visible_count <> 0 THEN RAISE EXCEPTION 'Ordinary account unexpectedly read internal settings'; END IF;
 SELECT count(*) INTO visible_count FROM public.public_feature_availability();
 IF visible_count <> expected_count THEN RAISE EXCEPTION 'Student feature availability changed'; END IF;
 EXECUTE 'RESET ROLE';
END $$;