# Vercel deployment quick guide

This is a Next.js application and can be deployed directly to Vercel.

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial AS Code Assess release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/as-code-assess.git
git push -u origin main
```

Do not commit `.env.local`, passwords, Supabase service keys, recordings, or student data.

## 2. Import into Vercel

1. Open https://vercel.com/new.
2. Import the GitHub repository.
3. Keep the framework preset as **Next.js**.
4. Keep the default build command: `next build`.
5. Keep the default output configuration.

## 3. Add environment variables

In Vercel Project Settings → Environment Variables, add these for Preview and Production:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`.

Set `NEXT_PUBLIC_APP_URL` to the exact deployed URL, for example:

```text
https://assess.as-code.tech
```

## 4. Configure Supabase callbacks

In Supabase Authentication → URL Configuration, set the production Site URL and add:

```text
https://YOUR_DOMAIN/admin/reset-password
https://YOUR_DOMAIN/student/reset-password
```

## 5. Deploy and test

After the first deploy, verify:

- `/admin/login`
- `/student/login`
- admin role rejection for student accounts
- student data isolation
- test assignment access
- camera and microphone permissions
- screen sharing
- private recording upload
- answer locking
- automatic submission
- password reset email

## 6. Custom domain

Add `assess.as-code.tech` in Vercel Project Settings → Domains. Follow the DNS record shown by Vercel. Do not manually configure TLS certificates; Vercel provisions HTTPS after DNS verification.
