alter table public.subscription_plans add column original_price_year integer, add column original_price_two_year integer;
update public.subscription_plans set original_price_year=case id when 'base' then 249900 when 'catalyst' then 399900 else 449900 end,original_price_two_year=case id when 'base' then 249900 when 'catalyst' then 399900 else 799900 end;
create or replace function public.has_role(_user_id uuid,_role public.app_role) returns boolean language sql stable security definer set search_path=public as $$ select _user_id=auth.uid() and exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create function public.refresh_free_after_import() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.refresh_free_questions(); return null; end $$;
revoke all on function public.refresh_free_after_import() from public,anon,authenticated;
create trigger free_after_insert after insert on public.questions for each statement execute function public.refresh_free_after_import();
create trigger free_after_delete after delete on public.questions for each statement execute function public.refresh_free_after_import();