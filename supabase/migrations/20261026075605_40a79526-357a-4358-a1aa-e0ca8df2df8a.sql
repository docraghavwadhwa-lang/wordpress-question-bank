create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  college text,
  study_year text,
  avatar_url text,
  streak_goal integer not null default 20,
  streak_target_days integer not null default 30,
  last_celebrated_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Own profile add" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Own profile edit" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, avatar_url)
select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')
from auth.users on conflict (id) do nothing;

alter table public.attempts add column archived boolean not null default false;
create index if not exists attempts_user_idx on public.attempts (user_id, created_at);

create or replace function public.qb_subject_stats()
returns table(subject text, total integer, attempted integer, correct integer)
language sql stable security invoker set search_path = public as $$
  with latest as (
    select distinct on (a.question_id) a.question_id, a.correct
    from attempts a where a.user_id = auth.uid() and not a.archived
    order by a.question_id, a.created_at desc, a.id desc
  )
  select d.subject, d.question_count,
    coalesce(count(l.question_id),0)::int,
    coalesce(count(l.question_id) filter (where l.correct),0)::int
  from decks d
  left join questions q on q.subject = d.subject
  left join latest l on l.question_id = q.id
  where d.depth = 1
  group by d.subject, d.question_count, d.sort_key
  order by d.sort_key;
$$;

create or replace function public.qb_daily_counts(_tz text default 'UTC')
returns table(day date, questions integer, correct integer, seconds integer)
language sql stable security invoker set search_path = public as $$
  select (created_at at time zone _tz)::date, count(*)::int,
    count(*) filter (where correct)::int, coalesce(sum(seconds),0)::int
  from attempts where user_id = auth.uid()
  group by 1 order by 1;
$$;

create or replace function public.qb_reset(_subject text default null)
returns void language sql security definer set search_path = public as $$
  update attempts a set archived = true
  where a.user_id = auth.uid() and not a.archived
    and (_subject is null or exists (select 1 from questions q where q.id = a.question_id and q.subject = _subject));
$$;
grant execute on function public.qb_subject_stats() to authenticated;
grant execute on function public.qb_daily_counts(text) to authenticated;
grant execute on function public.qb_reset(text) to authenticated;
revoke execute on function public.qb_reset(text) from anon, public;