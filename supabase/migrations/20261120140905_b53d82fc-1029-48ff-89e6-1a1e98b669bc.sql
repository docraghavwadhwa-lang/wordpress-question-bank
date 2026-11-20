CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT _user_id=auth.uid() AND public.device_session_active() AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role); $$;
CREATE OR REPLACE FUNCTION public.qb_blitz_rank(_day date) RETURNS TABLE(my_score integer,my_seconds integer,my_rank integer,players integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ WITH r AS (SELECT user_id,score,seconds,rank() OVER (ORDER BY score DESC,seconds ASC)::int rk FROM public.blitz_results WHERE day=_day) SELECT r.score,r.seconds,r.rk,(SELECT count(*)::int FROM r) FROM r WHERE r.user_id=auth.uid() AND public.device_session_active(); $$;
DO $$ DECLARE uid uuid; first_session uuid:=gen_random_uuid(); second_session uuid:=gen_random_uuid(); third_session uuid:=gen_random_uuid(); result jsonb; BEGIN SELECT id INTO uid FROM public.profiles LIMIT 1; IF uid IS NULL THEN RETURN; END IF;
BEGIN
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',first_session)::text,true);
result:=public.register_account_device(gen_random_uuid(),'Device test 1'); IF result->>'status'<>'active' THEN RAISE EXCEPTION 'First device should be active'; END IF;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',second_session)::text,true);
result:=public.register_account_device(gen_random_uuid(),'Device test 2'); IF result->>'status'<>'active' THEN RAISE EXCEPTION 'Second device should be active'; END IF;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',third_session)::text,true);
result:=public.register_account_device(gen_random_uuid(),'Device test 3'); IF result->>'status'<>'choose' OR jsonb_array_length(result->'devices')<>2 THEN RAISE EXCEPTION 'Third device must choose between two devices'; END IF;
result:=public.register_account_device(gen_random_uuid(),'Device test 3',first_session); IF result->>'status'<>'active' THEN RAISE EXCEPTION 'Replacement must activate third device'; END IF;
IF (SELECT count(*) FROM public.account_devices WHERE user_id=uid AND revoked_at IS NULL)<>2 THEN RAISE EXCEPTION 'Limit must remain two'; END IF;
PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','session_id',first_session)::text,true);
IF public.device_session_active() THEN RAISE EXCEPTION 'Removed session must lose access'; END IF;
result:=public.register_account_device(gen_random_uuid(),'Removed device'); IF result->>'status'<>'revoked' THEN RAISE EXCEPTION 'Revoked session must not register again'; END IF;
RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='device tests passed; roll back all test changes';
EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
END;
END $$;