# Final handoff

This package was generated from the AS Code Assess specification.

## Latest login fix

- Public `/admin/login` and `/student/login` pages no longer require an existing session.
- Password recovery pages are also public.
- Protected dashboard pages still enforce authentication and role checks.
- The public homepage exposes only the student login; administrator login remains available at `/admin/login`.
- The admin dashboard now includes mobile navigation, visible sign-out, and quick-action cards.
- Admin workflows now include student creation/status control, test creation with MCQ/theory questions, test publishing/closing, and assignment creation.
- Assessment recording now flushes chunks and finalizes the recording session when an attempt is submitted or expires.

## Browser security warning

If Chrome displays a "Dangerous site" warning for the Vercel domain, that is a Google Safe Browsing/domain reputation issue, not an application UI feature. Do not enter credentials until it is cleared. Verify the Vercel deployment and custom domain, remove any unknown redirects or injected scripts, review Vercel logs, and request a Google Safe Browsing review through Google Search Console after confirming the deployment is clean.

## Validation completed

- `npm run typecheck` — passed
- `npm test` — passed (4 tests)
- `npm run build` — passed
- Production dependency audit — 2 advisories remain (1 moderate, 1 high) in the installed dependency tree; run `npm audit` and review before production deployment.

## What is included

- Next.js App Router + TypeScript + Tailwind CSS application
- Supabase Auth/server session handling and middleware
- PostgreSQL migration with RLS, indexes, assessment RPCs, and private buckets
- Admin/student shells and dashboards
- Server-authoritative attempt start, answer submission, locking, and finalization
- Browser preflight and chunked recording upload route
- PDF/DOCX/TXT parser preview workflow; imported questions are never auto-published
- Password change and password recovery pages
- Setup, deployment, database, security, recording, admin, student, troubleshooting, environment, architecture, and production-checklist docs
- Unit tests and a Playwright smoke test

## Before any real assessment

Apply the migration in a staging Supabase project, create the first admin manually, configure SMTP and callback URLs, create a test student, and complete the production checklist using real camera/microphone/screen-share devices. Add the remaining admin CRUD/review screens your operational team needs before inviting students at scale.
