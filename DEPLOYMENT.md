# Deployment: GitHub → Vercel → custom domain

## Recommended release sequence

1. Local development.
2. Separate Supabase staging project.
3. Vercel preview deployment.
4. Device and security testing.
5. Separate Supabase production project.
6. Vercel production deployment.
7. Custom domain and HTTPS.

Do not point students at the first generated deployment.

## GitHub

```bash
git init
git add .
git commit -m "Initial AS Code Assess implementation"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/AS-Code-Assess.git
git push -u origin main
```

Before pushing:

```bash
git status
find . -maxdepth 2 -name '.env*' -not -name '.env.example'
```

The second command must not show `.env.local`. Review the diff for passwords, service keys, recordings, and student data.

## Vercel

1. Open <https://vercel.com> and import the GitHub repository.
2. Framework preset: Next.js.
3. Add environment variables for **Production**, **Preview**, and **Development** as appropriate:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (the exact Vercel/custom-domain URL for that environment)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed)
4. Deploy and wait for the build.
5. Open the deployment URL.
6. Test admin login, student login, RLS isolation, database operations, preflight, recording, and automatic submission.

Run locally before deployment:

```bash
npm run typecheck
npm test
npm run build
```

## Supabase production URL configuration

In **Authentication → URL Configuration**, set the Site URL to the production URL and add the exact reset callback URL, for example:

`https://assess.as-code.tech/admin/reset-password`

Configure SMTP and verify password recovery from a real inbox.

## Custom domain

Use either `as-code.tech` or a subdomain such as `assess.as-code.tech`. In Vercel **Project → Settings → Domains**, add the domain and follow the DNS records Vercel displays. Do not manually implement TLS certificates; Vercel provisions HTTPS after DNS verification. Use HTTPS for all non-local testing.

## Rollback

Use Vercel's previous deployment rollback, revert the Git commit, and preserve the Supabase database. Never delete production recordings or data as part of an application rollback.
