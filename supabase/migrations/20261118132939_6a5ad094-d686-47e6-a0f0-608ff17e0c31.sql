ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS attempts_question_id_fkey;
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_question_id_fkey;
DELETE FROM public.bookmarks WHERE question_id IS NOT NULL;
DELETE FROM public.questions WHERE id IS NOT NULL;
DELETE FROM public.decks WHERE path IS NOT NULL;