ALTER TABLE public.payment_requests ADD COLUMN cashfree_order_id text UNIQUE, ADD COLUMN cashfree_environment text CHECK (cashfree_environment IN ('sandbox','live')), ADD COLUMN verified_paid_at timestamptz;
CREATE FUNCTION public.reserve_cashfree_payment(_user uuid,_plan text,_months integer,_coupon text,_total integer,_discount integer,_environment text) RETURNS SETOF public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.payment_requests; BEGIN
IF _environment NOT IN ('sandbox','live') OR _months NOT IN (12,24) OR _total<100 OR _discount<0 OR _discount>100 THEN RAISE EXCEPTION 'Invalid payment choice'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(_user::text||':'||_plan,0));
SELECT * INTO r FROM public.payment_requests WHERE user_id=_user AND plan_id=_plan AND status='pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
IF FOUND THEN
 IF r.cashfree_order_id IS NULL THEN RAISE EXCEPTION 'An earlier payment for this plan is awaiting administrator review'; END IF;
 IF r.months<>_months OR r.total_paise<>_total OR r.coupon_code IS DISTINCT FROM nullif(upper(btrim(_coupon)),'') OR r.cashfree_environment<>_environment THEN RAISE EXCEPTION 'A payment for a different offer is already pending. Please complete it or contact us before changing your offer'; END IF;
 RETURN NEXT r; RETURN;
END IF;
INSERT INTO public.payment_requests(user_id,plan_id,months,total_paise,coupon_code,discount_percent,payment_reference,cashfree_environment) VALUES(_user,_plan,_months,_total,nullif(upper(btrim(_coupon)),''),_discount,'Cashfree — awaiting payment',_environment) RETURNING * INTO r;
UPDATE public.payment_requests SET cashfree_order_id='elixir_'||replace(r.id::text,'-',''),payment_reference='Cashfree elixir_'||replace(r.id::text,'-','') WHERE id=r.id RETURNING * INTO r;
RETURN NEXT r; END $$;
REVOKE ALL ON FUNCTION public.reserve_cashfree_payment(uuid,text,integer,text,integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_cashfree_payment(uuid,text,integer,text,integer,integer,text) TO service_role;
CREATE FUNCTION public.record_cashfree_payment(_request uuid,_order text,_paid integer,_environment text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
UPDATE public.payment_requests SET verified_paid_at=coalesce(verified_paid_at,now()),updated_at=now(),payment_reference='Cashfree verified · '||cashfree_order_id WHERE id=_request AND cashfree_order_id=_order AND total_paise=_paid AND cashfree_environment=_environment AND status IN ('pending','approved');
RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.record_cashfree_payment(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_cashfree_payment(uuid,text,integer,text) TO service_role;