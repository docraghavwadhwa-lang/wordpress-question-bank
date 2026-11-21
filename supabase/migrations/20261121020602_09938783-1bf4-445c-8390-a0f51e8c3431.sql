CREATE SCHEMA IF NOT EXISTS elixir_private;
REVOKE ALL ON SCHEMA elixir_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA elixir_private TO authenticated;
ALTER FUNCTION public.admin_allocate_trial(uuid,text,integer,date,text,uuid) SET SCHEMA elixir_private;
CREATE FUNCTION public.admin_allocate_trial(_user uuid, _plan text, _days integer, _start date, _note text DEFAULT '', _subscription uuid DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$ SELECT elixir_private.admin_allocate_trial(_user,_plan,_days,_start,_note,_subscription); $$;
REVOKE ALL ON FUNCTION public.admin_allocate_trial(uuid,text,integer,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_allocate_trial(uuid,text,integer,date,text,uuid) TO authenticated;