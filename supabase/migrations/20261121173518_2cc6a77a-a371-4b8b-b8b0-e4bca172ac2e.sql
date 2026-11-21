ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS price_three_year integer, ADD COLUMN IF NOT EXISTS original_price_three_year integer;
INSERT INTO public.subscription_plans(id,name,description,price_year,price_two_year,price_three_year,original_price_year,original_price_two_year,original_price_three_year,perks,enabled)
SELECT 'reagent','Elixir Reagent','Preclinical + paraclinical subjects',149900,249900,349900,original_price_year,original_price_two_year,349900,perks,true FROM public.subscription_plans WHERE id='base'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.plan_subjects(plan_id,subject) SELECT 'reagent',subject FROM public.plan_subjects WHERE plan_id='base' AND subject NOT IN ('PSM','FMT') ON CONFLICT DO NOTHING;
INSERT INTO public.plan_subjects(plan_id,subject) VALUES('catalyst','PSM'),('catalyst','FMT') ON CONFLICT DO NOTHING;
-- Legacy Base stays for existing subscribers (keeps PSM/FMT) but can no longer be bought.
UPDATE public.subscription_plans SET enabled=false WHERE id='base';
UPDATE public.subscription_plans SET description='Clinical subjects + PSM and FMT', price_two_year=419900, original_price_two_year=greatest(original_price_two_year,419900), price_three_year=599900, original_price_three_year=599900 WHERE id='catalyst';
UPDATE public.subscription_plans SET price_three_year=899900, original_price_three_year=899900 WHERE id='panacea';

CREATE OR REPLACE FUNCTION public.quote_plan(_plan text,_months integer,_coupon text DEFAULT '') RETURNS TABLE(total_paise integer,discount_percent integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p public.subscription_plans; d integer:=0; amount integer; BEGIN
IF auth.uid() IS NULL OR NOT public.device_session_active() THEN RAISE EXCEPTION 'Sign in on an active device to select a plan'; END IF;
IF NOT public.feature_enabled('checkout') AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Plan purchases are currently disabled'; END IF;
SELECT * INTO p FROM public.subscription_plans WHERE id=_plan AND enabled; IF NOT FOUND OR _months NOT IN (12,24,36) OR (_months=36 AND p.price_three_year IS NULL) THEN RAISE EXCEPTION 'Choose a valid plan and duration'; END IF;
IF btrim(_coupon)<>'' AND upper(btrim(_coupon)) NOT IN ('AIR-PG','NIRMAYACARE') THEN SELECT percent INTO d FROM public.discount_coupons WHERE code=upper(btrim(_coupon)) AND enabled; IF NOT FOUND THEN RAISE EXCEPTION 'The coupon you have applied is invalid'; END IF; END IF;
amount:=CASE _months WHEN 12 THEN p.price_year WHEN 24 THEN p.price_two_year ELSE p.price_three_year END;
RETURN QUERY SELECT round(amount*(100-d)/100.0)::int,d; END $$;

CREATE OR REPLACE FUNCTION public.reserve_cashfree_payment(_user uuid,_plan text,_months integer,_coupon text,_total integer,_discount integer,_environment text) RETURNS SETOF public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.payment_requests; BEGIN
IF _environment NOT IN ('sandbox','live') OR _months NOT IN (12,24,36) OR _total<100 OR _discount<0 OR _discount>100 THEN RAISE EXCEPTION 'Invalid payment choice'; END IF;
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

-- Verified Cashfree payments now allocate access automatically (starting after any active plan of the same kind).
CREATE OR REPLACE FUNCTION public.record_cashfree_payment(_request uuid,_order text,_paid integer,_environment text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.payment_requests; s timestamptz; BEGIN
UPDATE public.payment_requests SET verified_paid_at=coalesce(verified_paid_at,now()),updated_at=now(),payment_reference='Cashfree verified · '||cashfree_order_id WHERE id=_request AND cashfree_order_id=_order AND total_paise=_paid AND cashfree_environment=_environment AND status IN ('pending','approved') RETURNING * INTO r;
IF NOT FOUND THEN RETURN false; END IF;
IF r.status='pending' AND NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE payment_request_id=r.id) THEN
 SELECT greatest(now(),coalesce(max(ends_at),now())) INTO s FROM public.subscriptions WHERE user_id=r.user_id AND plan_id=r.plan_id AND NOT revoked;
 INSERT INTO public.subscriptions(user_id,plan_id,starts_at,ends_at,approved_by,payment_request_id) VALUES(r.user_id,r.plan_id,s,s+make_interval(months=>r.months),r.user_id,r.id);
 UPDATE public.payment_requests SET status='approved' WHERE id=r.id;
END IF;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.record_cashfree_payment(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_cashfree_payment(uuid,text,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.reserve_cashfree_payment(uuid,text,integer,text,integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_cashfree_payment(uuid,text,integer,text,integer,integer,text) TO service_role;