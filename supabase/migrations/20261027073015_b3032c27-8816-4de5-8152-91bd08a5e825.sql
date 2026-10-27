create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;
alter table public.push_tokens enable row level security;
create policy "Own tokens read" on public.push_tokens for select to authenticated using (auth.uid() = user_id);
create policy "Own tokens add" on public.push_tokens for insert to authenticated with check (auth.uid() = user_id);
create policy "Own tokens edit" on public.push_tokens for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own tokens remove" on public.push_tokens for delete to authenticated using (auth.uid() = user_id);

create table public.push_log (
  day date primary key,
  sent_at timestamptz not null default now()
);
grant all on public.push_log to service_role;
alter table public.push_log enable row level security;

create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('qotd-push', '30 2 * * *', $$
  select net.http_post(
    url := 'https://project--b91ab3e6-9bc3-425e-b3b4-fa29218e2926.lovable.app/api/public/push-qotd',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);