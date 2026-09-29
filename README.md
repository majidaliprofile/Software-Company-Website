# AS Code Assess

**Secure assessments for practical learning.** Built for AS Code Tech.

AS Code Assess is a production-oriented Next.js + Supabase assessment platform with:

- Admin and student roles with server-side authorization
- Supabase Auth, PostgreSQL, RLS, and private Storage buckets
- MCQ auto-grading and theory-answer review foundations
- Server-authoritative test start, expiry, answer locking, and automatic submission
- Camera, microphone, and screen-share preflight with chunked browser recording
- Activity logs and attempt/recording relationships
- Responsive, restrained enterprise UI

## Quick start

```bash
cp .env.example .env.local
# Fill .env.local from Supabase Project Settings → API
npm install
npm run dev
```

Open `http://localhost:3000`. Apply `supabase/migrations/0001_initial.sql` before logging in.

## Documentation

- [SETUP.md](SETUP.md) — beginner setup, Supabase, first admin, local run
- [DEPLOYMENT.md](DEPLOYMENT.md) — GitHub, Vercel, domain, staging → production
- [DATABASE.md](DATABASE.md) — schema, migration, RLS, seed workflow
- [SECURITY.md](SECURITY.md) — trust boundaries and hardening checklist
- [RECORDING.md](RECORDING.md) — permissions, chunk storage, retention, recovery
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md) — admin operations and theory grading
- [STUDENT_GUIDE.md](STUDENT_GUIDE.md) — student experience and requirements
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — common fixes
- [ENVIRONMENT.md](ENVIRONMENT.md) — environment variable reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design
- [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) — release gate

## Security boundary

Never commit `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, passwords, recordings, or student data. The service-role key is server-only and is intentionally not imported by client components.

## Important production note

Browser recording and screen sharing require HTTPS (localhost is allowed for development), explicit permission, a supported browser, storage capacity, and an agreed retention policy. Test these flows in staging with real devices before student use.

## Login URLs

The public landing page exposes only the student login. Administrator access is intentionally available only by direct URL: `/admin/login`.

## Question paper import

Administrators can use `/admin/import` to upload a PDF, DOCX, or TXT paper for parsing. The current parser provides a review preview only. It deliberately does not write or publish questions until an explicit reviewed save workflow is added.
