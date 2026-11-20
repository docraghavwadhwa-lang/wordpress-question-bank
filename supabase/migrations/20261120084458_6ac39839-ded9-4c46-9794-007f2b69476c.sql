alter table public.payment_requests add column if not exists razorpay_order_id text unique;
alter table public.subscriptions alter column approved_by drop not null;
create or replace function public.activate_razorpay_payment(_request uuid, _paid integer)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare r public.payment_requests; sid uuid; begin
update public.payment_requests set status='approved', updated_at=now() where id=_request and status='pending' and razorpay_order_id is not null and total_paise=_paid returning * into r;
if not found then return null; end if;
insert into public.subscriptions(user_id,plan_id,starts_at,ends_at,approved_by,payment_request_id)
values(r.user_id,r.plan_id,now(),now()+make_interval(months=>r.months),null,r.id) returning id into sid;
return sid; end $$;
revoke all on function public.activate_razorpay_payment(uuid,integer) from public, anon, authenticated;
grant execute on function public.activate_razorpay_payment(uuid,integer) to service_role;