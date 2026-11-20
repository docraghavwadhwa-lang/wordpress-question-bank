ALTER TABLE public.profiles ADD COLUMN college_state text, ADD COLUMN admission_year integer, ADD COLUMN onboarding_completed_at timestamptz;
UPDATE public.profiles SET onboarding_completed_at = now();
CREATE TABLE public.colleges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, state text NOT NULL, normalized_name text GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(state, normalized_name));
GRANT SELECT ON public.colleges TO authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in students read college names" ON public.colleges FOR SELECT TO authenticated USING (true);
CREATE OR REPLACE FUNCTION public.complete_onboarding(_study_year text, _college text, _state text, _admission_year integer, _phone text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); clean_college text := regexp_replace(btrim(_college), '\s+', ' ', 'g'); clean_phone text := regexp_replace(_phone, '[\s()-]', '', 'g');
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to complete your profile'; END IF;
 IF _study_year NOT IN ('MBBS - First year','MBBS - Second year','MBBS - Third year','MBBS - Fourth year') OR _study_year IS NULL THEN RAISE EXCEPTION 'Choose your MBBS year'; END IF;
 IF clean_college IS NULL OR length(clean_college) < 2 OR length(clean_college) > 150 OR clean_college ~ '[<>[:cntrl:]]' THEN RAISE EXCEPTION 'Enter a valid college name'; END IF;
 IF _state IS NULL OR _state NOT IN ('Andaman & Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra & Nagar Haveli and Daman & Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Outside India') THEN RAISE EXCEPTION 'Choose your college location'; END IF;
 IF _admission_year IS NULL OR _admission_year < 1950 OR _admission_year > extract(year from current_date)::int THEN RAISE EXCEPTION 'Choose a valid admission year'; END IF;
 IF clean_phone IS NULL OR clean_phone !~ '^\+[1-9][0-9]{9,14}$' THEN RAISE EXCEPTION 'Enter a valid phone number with country code'; END IF;
 PERFORM 1 FROM public.profiles WHERE id = uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile unavailable. Please try again'; END IF;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND onboarding_completed_at IS NOT NULL) THEN RETURN; END IF;
 INSERT INTO public.colleges(name, state) VALUES(clean_college, _state) ON CONFLICT(state, normalized_name) DO NOTHING;
 UPDATE public.profiles SET study_year = _study_year, college = clean_college, college_state = _state, admission_year = _admission_year, phone = clean_phone, onboarding_completed_at = now(), updated_at = now() WHERE id = uid;
END; $$;
REVOKE ALL ON FUNCTION public.complete_onboarding(text,text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text,text,text,integer,text) TO authenticated;