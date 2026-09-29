# Local and Supabase setup

This guide is written for a beginner. Do not skip the staging step.

## 1. Install prerequisites

Install Node.js 20+ (Node 22 LTS is recommended), Git, a GitHub account, a Supabase account, and a Vercel account.

Verify:

```bash
node --version
npm --version
git --version
```

## 2. Create a Supabase project

1. Open <https://supabase.com/dashboard> and create an account.
2. Select **New project**.
3. Use a strong database password and save it in your password manager.
4. Choose a region close to your students.
5. Wait until the project is ready.
6. Open **Project Settings → API** and copy the Project URL and the public `anon` key.
7. Do not copy the service-role key into browser code or a GitHub file.

## 3. Configure the repository

```bash
git clone https://github.com/YOUR_ACCOUNT/AS-Code-Assess.git
cd AS-Code-Assess
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

For local development, the service-role key is used only by server-only admin workflows. Never prefix it with `NEXT_PUBLIC_`.

## 4. Apply the database migration

Option A — Supabase SQL Editor:

1. Open **SQL Editor → New query**.
2. Paste the complete contents of `supabase/migrations/0001_initial.sql`.
3. Run it once.
4. If Supabase reports a line-specific error, stop and fix that error; do not continue with a partially applied schema.

Option B — Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates tables, indexes, functions, RLS policies, and private storage buckets.

## 5. Configure authentication

In Supabase **Authentication → Providers**, enable Email. Keep email confirmation enabled for production. In **Authentication → URL Configuration**, add:

- Local site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/admin/reset-password`
- Redirect URL: `http://localhost:3000/student/reset-password` (if you add a student-specific recovery page)

For production, replace these with your Vercel domain and custom domain URLs. Configure SMTP before student rollout; the built-in email service is rate-limited.

## 6. Create the initial administrator

1. Open **Authentication → Users → Add user → Create new user**.
2. Use exactly `aqibamin0099@gmail.com`.
3. Enter a new password manually in the Supabase dialog. Do not generate or record it in source code.
4. Confirm the user if you have email confirmation enabled for the workflow.
5. Copy the user's UUID.
6. In SQL Editor run, replacing only the UUID:

```sql
update public.profiles
set role = 'ADMIN', is_active = true, full_name = 'AS Code Tech Administrator'
where id = 'PASTE_AUTH_USER_UUID_HERE';
```

The trigger created by the migration creates the profile row. If it does not exist, verify the migration and user creation, then run:

```sql
insert into public.profiles (id, email, role, is_active)
select id, email, 'ADMIN', true from auth.users
where email = 'aqibamin0099@gmail.com'
on conflict (id) do update set role='ADMIN', is_active=true;
```

7. Start the app and open `http://localhost:3000/admin/login`.
8. Sign in with the manually entered password.
9. Use **Settings → Account security** and the Supabase recovery flow to rotate it before production.

No password is stored in this repository, SQL migration, README, or public configuration.

## 7. Run the application

```bash
npm install
npm run typecheck
npm test
npm run dev
```

Open `http://localhost:3000`. Confirm the landing page, admin login, admin dashboard, and student login.

## 8. Create a staging student

Use Supabase Authentication to create a test student with a password you choose privately. Its profile defaults to `STUDENT`. Create tests and assignments using the secured admin workflow or SQL while this package is being integrated into your admin CRUD screens. Never use real student data for staging.

## 9. Validation order

Test login → RLS → published test → assignment → preflight → attempt start → one answer → answer lock → expiration → automatic submission → private recording access. See `docs/PRODUCTION_CHECKLIST.md`.
