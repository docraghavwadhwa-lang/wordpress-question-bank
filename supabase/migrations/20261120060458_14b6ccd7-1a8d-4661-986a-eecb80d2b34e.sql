ALTER FUNCTION public.complete_onboarding(text,text,text,integer,text) SECURITY INVOKER;
GRANT INSERT ON public.colleges TO authenticated;
CREATE POLICY "New students contribute college names" ON public.colleges FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND onboarding_completed_at IS NULL));
CREATE OR REPLACE FUNCTION public.validate_college() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
 NEW.name := regexp_replace(btrim(NEW.name), '\s+', ' ', 'g');
 IF length(NEW.name) < 2 OR length(NEW.name) > 150 OR NEW.name ~ '[<>[:cntrl:]]' OR length(btrim(NEW.state)) < 2 OR length(NEW.state) > 80 THEN RAISE EXCEPTION 'Invalid college details'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_college BEFORE INSERT OR UPDATE ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.validate_college();