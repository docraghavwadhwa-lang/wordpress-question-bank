<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Q-Bank data (decks, questions) is public-read in Supabase and fetched from the browser client; bookmarks/attempts are per-user via RLS — keeps the site static-friendly for Vercel without server functions.
- Questions were imported once from the WordPress plugin's questions.json (note_id = questions.id); deck hierarchy lives in the `decks` table — re-import by upserting both.
- Question stems/options/explanations are trusted Anki HTML rendered with dangerouslySetInnerHTML.
- Streaks/stats come from the `attempts` table via SQL functions (qb_daily_counts, qb_subject_stats, qb_reset); reset sets `archived` instead of deleting so streak history survives resets.
- Profile photos are stored as small data URLs in profiles.avatar_url because the workspace blocks public storage buckets.
- Signed-in-only pages live under src/routes/_authenticated/; the home page shows a sign-in landing when signed out.
