DO $$ DECLARE uid uuid; sid uuid:=gen_random_uuid(); amount integer; BEGIN SELECT id INTO uid FROM public.profiles LIMIT 1; IF uid IS NULL THEN RETURN; END IF; BEGIN
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true);
PERFORM public.register_account_device(gen_random_uuid(),'Offer test');
SELECT total_paise INTO amount FROM public.quote_plan('base',12,'NIRMAYACARE'); IF amount<>149900 THEN RAISE EXCEPTION 'Base annual offer changed'; END IF;
SELECT total_paise INTO amount FROM public.quote_plan('base',24,'NIRMAYACARE'); IF amount<>249900 THEN RAISE EXCEPTION 'Base two-year offer changed'; END IF;
SELECT total_paise INTO amount FROM public.quote_plan('catalyst',12,'NIRMAYACARE'); IF amount<>249900 THEN RAISE EXCEPTION 'Catalyst annual offer changed'; END IF;
SELECT total_paise INTO amount FROM public.quote_plan('catalyst',24,'NIRMAYACARE'); IF amount<>399900 THEN RAISE EXCEPTION 'Catalyst two-year offer changed'; END IF;
SELECT total_paise INTO amount FROM public.quote_plan('panacea',12,'NIRMAYACARE'); IF amount<>399900 THEN RAISE EXCEPTION 'Panacea annual offer changed'; END IF;
SELECT total_paise INTO amount FROM public.quote_plan('panacea',24,'NIRMAYACARE'); IF amount<>599900 THEN RAISE EXCEPTION 'Panacea two-year offer changed'; END IF;
RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='Offer tests passed; roll back fixtures';
EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL; END; END $$;
CREATE OR REPLACE FUNCTION public.account_device_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER account_device_updated BEFORE UPDATE ON public.account_devices FOR EACH ROW EXECUTE FUNCTION public.account_device_touch();