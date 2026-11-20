CREATE OR REPLACE FUNCTION public.public_feature_availability()
RETURNS TABLE(key text, label text, enabled boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT f.key, f.label, f.enabled, NULL::timestamptz
 FROM public.feature_settings f
 WHERE f.key IN ('qbanks','image_questions','test_mode','bookmarks','mistake_vault','daily_blitz','qotd','reminders','offline_downloads','progress','reviews','checkout')
 ORDER BY f.label
$$;
COMMENT ON FUNCTION public.public_feature_availability() IS 'Intentionally public, read-only allowlisted UI availability. No caller inputs, dynamic SQL, writes, actor identities or internal timestamps. Definer required because base settings are administrator-only.';
ALTER FUNCTION public.feature_enabled(text) SECURITY INVOKER;
DO $$ BEGIN
 EXECUTE 'SET LOCAL ROLE anon';
 IF EXISTS(SELECT 1 FROM public.public_feature_availability() WHERE updated_at IS NOT NULL) THEN RAISE EXCEPTION 'Internal timestamp exposed'; END IF;
 IF EXISTS(SELECT 1 FROM public.public_feature_availability() f WHERE public.feature_enabled(f.key) IS DISTINCT FROM f.enabled) THEN RAISE EXCEPTION 'Feature enforcement mismatch'; END IF;
 EXECUTE 'RESET ROLE';
END $$;