create table public.blitz_results (
  user_id uuid not null,
  day date not null,
  score integer not null,
  seconds integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
grant select, insert on public.blitz_results to authenticated;
grant all on public.blitz_results to service_role;
alter table public.blitz_results enable row level security;
create policy "Own blitz read" on public.blitz_results for select to authenticated using (auth.uid() = user_id);
create policy "Own blitz add" on public.blitz_results for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.qb_blitz_rank(_day date)
returns table(my_score integer, my_seconds integer, my_rank integer, players integer)
language sql stable security definer set search_path = public as $$
  with r as (
    select user_id, score, seconds, rank() over (order by score desc, seconds asc)::int rk
    from blitz_results where day = _day
  )
  select r.score, r.seconds, r.rk, (select count(*)::int from r)
  from r where r.user_id = auth.uid();
$$;
revoke execute on function public.qb_blitz_rank(date) from anon, public;
grant execute on function public.qb_blitz_rank(date) to authenticated;