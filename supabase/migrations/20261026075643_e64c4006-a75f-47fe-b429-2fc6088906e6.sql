revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant update (archived) on public.attempts to authenticated;
create policy "Own attempts archive" on public.attempts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.qb_reset(_subject text default null)
returns void language sql security invoker set search_path = public as $$
  update attempts a set archived = true
  where a.user_id = auth.uid() and not a.archived
    and (_subject is null or exists (select 1 from questions q where q.id = a.question_id and q.subject = _subject));
$$;