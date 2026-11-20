CREATE OR REPLACE FUNCTION public.complete_onboarding(_study_year text, _college text, _state text, _admission_year integer, _phone text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); clean_college text := regexp_replace(btrim(_college), '\s+', ' ', 'g'); clean_phone text := regexp_replace(_phone, '[\s()-]', '', 'g');
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to complete your profile'; END IF;
 IF _study_year IS NULL OR _study_year NOT IN ('MBBS - First year','MBBS - Second year','MBBS - Third year','MBBS - Fourth year','Housemanship / Internship','Post MBBS') THEN RAISE EXCEPTION 'Choose your course'; END IF;
 IF clean_college IS NULL OR length(clean_college) < 2 OR length(clean_college) > 150 OR clean_college ~ '[<>[:cntrl:]]' THEN RAISE EXCEPTION 'Choose a valid college'; END IF;
 IF _state IS NULL OR length(btrim(_state)) < 2 OR length(_state) > 80 THEN RAISE EXCEPTION 'Choose your college location'; END IF;
 IF _admission_year IS NULL OR _admission_year < 2000 OR _admission_year > extract(year from current_date)::int THEN RAISE EXCEPTION 'Choose a valid admission year'; END IF;
 IF clean_phone IS NULL OR clean_phone !~ '^\+[1-9][0-9]{9,14}$' THEN RAISE EXCEPTION 'Enter a valid phone number with country code'; END IF;
 PERFORM 1 FROM public.profiles WHERE id = uid FOR UPDATE;
 IF NOT FOUND THEN
   INSERT INTO public.profiles(id) VALUES (uid) ON CONFLICT (id) DO NOTHING;
 END IF;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND onboarding_completed_at IS NOT NULL) THEN RETURN; END IF;
 UPDATE public.profiles SET study_year = _study_year, college = clean_college, college_state = _state, admission_year = _admission_year, phone = clean_phone, onboarding_completed_at = now(), updated_at = now() WHERE id = uid;
END; $$;
REVOKE ALL ON FUNCTION public.complete_onboarding(text,text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text,text,text,integer,text) TO authenticated;