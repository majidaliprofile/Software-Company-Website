# Architecture

AS Code Assess is a Next.js App Router application backed by Supabase.

- **Browser:** React client components for sign-in, preflight, timed assessment, and MediaRecorder.
- **Server:** Next.js server components and route handlers. Every protected page calls `requireRole`; every sensitive RPC re-verifies `auth.uid()` in PostgreSQL.
- **Database:** PostgreSQL schema and RLS are in `supabase/migrations/0001_initial.sql`.
- **Storage:** `recordings`, `question-papers`, and `optional-assets` buckets are private. Recording chunks are uploaded from the authenticated browser in small pieces; the database stores only metadata and private paths.
- **Authoritative exam operations:** `start_attempt`, `submit_answer`, and `finalize_attempt` are `security definer` functions with `search_path=public`. They calculate identity, expiration, score, and locking server-side.
- **Extensibility:** `question_type` is an enum today (`MCQ`, `THEORY`) and can be expanded through a reviewed migration. Each question has a type, ordered position, points, and optional options.

For a production release, keep the staging project separate from the production project and run the complete checklist in `docs/PRODUCTION_CHECKLIST.md`.
