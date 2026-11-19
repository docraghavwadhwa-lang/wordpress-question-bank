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
- Website branding imports the shared full-logo asset pointer; install icons and favicon derive from its matching symbol, with versioned icon URLs to refresh cached branding.
- Subject ordering and display aliases live in the browser-safe subjects module; preserve stored deck paths so downloads and quiz history keep working.
- Home study tools reuse the study Button variant and subject-grouped selection; keep reminder behavior and offline-download activation unchanged during visual changes.
- Q-Bank data (decks, questions) is public-read in Supabase and fetched from the browser client; bookmarks/attempts are per-user via RLS — keeps the site static-friendly for Vercel without server functions.
- Questions come from the Prepladder .apkg (note_id = questions.id, deck root "Prepladder" dropped, General Medicine→Medicine, OBG→"Obstetrics & Gyenacology"); images are webp in public/qimg because public storage buckets are blocked; attempts/bookmarks have no FK to questions so history survives re-imports.
- Question stems/options/explanations are trusted Anki HTML rendered with dangerouslySetInnerHTML.
- Streaks/stats come from the `attempts` table via SQL functions (qb_daily_counts, qb_subject_stats, qb_reset); reset sets `archived` instead of deleting so streak history survives resets.
- Profile photos are stored as small data URLs in profiles.avatar_url because the workspace blocks public storage buckets.
- Signed-in-only pages live under src/routes/_authenticated/; the home page shows a sign-in landing when signed out.
- Daily Blitz picks its questions deterministically from the date (same set for everyone) and ranks via the `qb_blitz_rank` security-definer RPC, which returns only the caller's own row — so ranks work without exposing other users' results.
- An in-progress practice quiz is saved to localStorage (question ids + progress) so leaving the quiz pauses it; storing ids rather than full questions keeps it under storage limits.
- Completed practice reviews use owner-scoped quiz_reviews plus a per-user local cache and the offline write queue; preserve stable bank keys and chosen answers so the latest completion can be reviewed across devices or offline.
- Group bookmarks by the root of deck_path and pass only that group's question IDs to both reading and practice modes; keep bookmark caches per user to avoid leaking saved selections between accounts.
- Daily Question-of-the-Day push is sent by pg_cron at 02:30 UTC to /api/public/push-qotd; push_log makes it once-per-day so the public route needs no secret.
- Offline: vite-plugin-pwa generateSW at /sw.js (registered only via src/lib/sw-register.ts, never in preview) runtime-caches pages, /assets, /qimg and Supabase REST GETs; writes go through writeOrQueue in src/lib/offline.ts and replay on reconnect. Firebase messaging worker uses its own scope so it doesn't collide with /sw.js.
- Android app: Capacitor shell in mobile/ loads the live site (server.url) and relies on the site's service worker for offline; GitHub Actions (.github/workflows/build-apk.yml) builds the APK so no Android SDK is needed locally.
- Android app: question images are bundled into the APK (www/qimg) and served by mobile/MainActivity.java intercepting /qimg/* (page + service worker requests) so they show offline without downloads.
- Android app: Google sign-in in the app uses redirect com.nirmayacare.medquiz://auth/callback (intent filter added in build-apk.yml, handled by src/lib/native-auth.ts via @capacitor/app) so login returns to the app, not Chrome.
- Android APK is published to GitHub release tag android-latest by build-apk.yml; the /app page links to its fixed download URL so the link never changes.

- Offline bank downloads use versioned IndexedDB rows in batches of 1,000 with deck/subject indexes; activate metadata only after a complete verified download, preserving the previous bank on failure and avoiding full-bank HTML reads. Old Cache API downloads require a fresh download rather than a memory-heavy migration.
