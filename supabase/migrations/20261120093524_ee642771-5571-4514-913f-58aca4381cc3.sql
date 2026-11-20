ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.refresh_free_questions()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ begin
  -- 10% of each subject's Q-banks (chapters), shuffled by a hash so there is no visible pattern; at least one per subject.
  update public.decks d set is_free = (r.rn <= greatest(1, floor(r.total*0.10)))
  from (select path, row_number() over(partition by subject order by md5('elixir-free:'||path)) rn, count(*) over(partition by subject) total
        from public.decks where depth = 3) r
  where d.path = r.path;
  update public.decks set is_free = false where depth <> 3 and is_free;
  update public.questions q set is_free = coalesce((select d.is_free from public.decks d where d.path = q.deck_path), false)
  where q.is_free is distinct from coalesce((select d.is_free from public.decks d where d.path = q.deck_path), false);
end $$;

SELECT public.refresh_free_questions();