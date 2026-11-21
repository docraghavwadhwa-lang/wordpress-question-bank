CREATE OR REPLACE FUNCTION public.admin_allocate_trial(_user uuid, _plan text, _days integer, _start date, _note text DEFAULT '', _subscription uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF _days IS NULL OR _days < 1 OR _days > 3650 OR _start IS NULL OR _note IS NULL OR length(_note)>480 THEN RAISE EXCEPTION 'Choose 1–3650 trial days, a start date and a valid note'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user) OR NOT EXISTS(SELECT 1 FROM public.subscription_plans WHERE id=_plan) THEN RAISE EXCEPTION 'Student or plan not found'; END IF;
 IF _subscription IS NULL THEN
 INSERT INTO public.subscriptions(user_id,plan_id,starts_at,ends_at,approved_by,amount_paid_paise,allocation_note)
 VALUES(_user,_plan,_start::timestamptz,_start::timestamptz + make_interval(days=>_days),auth.uid(),0,'Trial · '||_note) RETURNING id INTO sid;
 ELSE
 UPDATE public.subscriptions SET starts_at=_start::timestamptz,ends_at=_start::timestamptz+make_interval(days=>_days),amount_paid_paise=0,allocation_note='Trial · '||_note
 WHERE id=_subscription AND user_id=_user AND plan_id=_plan AND payment_request_id IS NULL AND allocation_note LIKE 'Trial · %' RETURNING id INTO sid;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trial not found'; END IF;
 END IF;
 RETURN sid;
END; $$;
REVOKE ALL ON FUNCTION public.admin_allocate_trial(uuid,text,integer,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_allocate_trial(uuid,text,integer,date,text,uuid) TO authenticated;
COMMENT ON FUNCTION public.admin_allocate_trial(uuid,text,integer,date,text,uuid) IS 'Authenticated entry point with active-device administrator verification before all writes; grants zero-cost day-based access and audited subscription changes.';