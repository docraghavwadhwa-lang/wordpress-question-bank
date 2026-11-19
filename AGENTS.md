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
- Questions come from the Prepladder .apkg (note_id = questions.id, deck root "Prepladder" dropped, General Medicine→Medicine, OBG→"Obstetrics & Gyenacology"); images are webp in public/qimg because public storage buckets are blocked; attempts/bookmarks have no FK to questions so history survives re-imports.
- Question stems/options/explanations are trusted Anki HTML rendered with dangerouslySetInnerHTML.
- Streaks/stats come from the `attempts` table via SQL functions (qb_daily_counts, qb_subject_stats, qb_reset); reset sets `archived` instead of deleting so streak history survives resets.
- Profile photos are stored as small data URLs in profiles.avatar_url because the workspace blocks public storage buckets.
- Signed-in-only pages live under src/routes/_authenticated/; the home page shows a sign-in landing when signed out.
- Daily Blitz picks its questions deterministically from the date (same set for everyone) and ranks via the `qb_blitz_rank` security-definer RPC, which returns only the caller's own row — so ranks work without exposing other users' results.
- An in-progress practice quiz is saved to localStorage (question ids + progress) so leaving the quiz pauses it; storing ids rather than full questions keeps it under storage limits.
- Daily Question-of-the-Day push is sent by pg_cron at 02:30 UTC to /api/public/push-qotd; push_log makes it once-per-day so the public route needs no secret.
- Offline: vite-plugin-pwa generateSW at /sw.js (registered only via src/lib/sw-register.ts, never in preview) runtime-caches pages, /assets, /qimg and Supabase REST GETs; writes go through writeOrQueue in src/lib/offline.ts and replay on reconnect. Firebase messaging worker uses its own scope so it doesn't collide with /sw.js.
- Android app: Capacitor shell in mobile/ loads the live site (server.url) and relies on the site's service worker for offline; GitHub Actions (.github/workflows/build-apk.yml) builds the APK so no Android SDK is needed locally.
- Android app: Google sign-in in the app uses redirect com.nirmayacare.medquiz://auth/callback (intent filter added in build-apk.yml, handled by src/lib/native-auth.ts via @capacitor/app) so login returns to the app, not Chrome.
