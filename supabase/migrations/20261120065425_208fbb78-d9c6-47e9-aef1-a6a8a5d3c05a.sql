revoke execute on function public.has_role(uuid,public.app_role),public.quote_plan(text,integer,text),public.submit_payment_request(text,integer,text,text),public.admin_students(text,integer),public.approve_subscription(uuid,text,integer,date,uuid),public.reject_payment(uuid),public.revoke_subscription(uuid),public.refresh_free_questions() from anon;
revoke execute on function public.refresh_free_questions() from authenticated;
revoke execute on function public.has_subject_access(text) from anon;
create or replace function public.has_subject_access(_subject text) returns boolean language sql stable security invoker set search_path=public as $$ select exists(select 1 from public.subscriptions s join public.plan_subjects ps on ps.plan_id=s.plan_id where s.user_id=auth.uid() and ps.subject=_subject and not s.revoked and s.starts_at<=now() and s.ends_at>now()) $$;
drop policy "Free sample or active subscription" on public.questions;
create policy "Guest free samples" on public.questions for select to anon using(is_free);
create policy "Student free or subscribed" on public.questions for select to authenticated using(is_free or public.has_subject_access(subject));