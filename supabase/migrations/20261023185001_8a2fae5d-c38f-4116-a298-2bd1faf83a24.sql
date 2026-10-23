CREATE TABLE public.decks (
  path text PRIMARY KEY,
  subject text NOT NULL,
  depth smallint NOT NULL,
  sort_key text NOT NULL DEFAULT '',
  question_count integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.decks TO anon, authenticated;
GRANT ALL ON public.decks TO service_role;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Decks are public" ON public.decks FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.questions (
  id bigint PRIMARY KEY,
  deck_path text NOT NULL,
  subject text NOT NULL,
  sort_key text NOT NULL DEFAULT '',
  stem text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer text,
  explanation text
);
CREATE INDEX questions_deck_path_idx ON public.questions (deck_path text_pattern_ops);
CREATE INDEX questions_subject_idx ON public.questions (subject);
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are public" ON public.questions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.bookmarks (
  user_id uuid NOT NULL,
  question_id bigint NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookmarks read" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own bookmarks add" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own bookmarks remove" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.attempts (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  question_id bigint NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  chosen text NOT NULL,
  correct boolean NOT NULL,
  seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_idx ON public.attempts (user_id);
GRANT SELECT, INSERT ON public.attempts TO authenticated;
GRANT USAGE ON SEQUENCE public.attempts_id_seq TO authenticated;
GRANT ALL ON public.attempts TO service_role;
GRANT ALL ON SEQUENCE public.attempts_id_seq TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own attempts read" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own attempts add" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);