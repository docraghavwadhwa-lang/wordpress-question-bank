CREATE TABLE public.quiz_reviews (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 quiz_key text NOT NULL,
 title text NOT NULL,
 question_ids bigint[] NOT NULL,
 choices jsonb NOT NULL DEFAULT '{}'::jsonb,
 score integer NOT NULL DEFAULT 0,
 answered integer NOT NULL DEFAULT 0,
 completed_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (jsonb_typeof(choices) = 'object'),
 CHECK (score >= 0 AND answered >= score)
);
GRANT SELECT, INSERT ON public.quiz_reviews TO authenticated;
GRANT ALL ON public.quiz_reviews TO service_role;
ALTER TABLE public.quiz_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own recent quiz reviews" ON public.quiz_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id AND completed_at > now() - interval '72 hours');
CREATE POLICY "Own quiz review add" ON public.quiz_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND completed_at <= now() + interval '5 minutes');
CREATE INDEX quiz_reviews_user_completed_idx ON public.quiz_reviews(user_id, completed_at DESC);
CREATE FUNCTION public.quiz_reviews_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER quiz_reviews_updated_at BEFORE UPDATE ON public.quiz_reviews FOR EACH ROW EXECUTE FUNCTION public.quiz_reviews_updated_at();