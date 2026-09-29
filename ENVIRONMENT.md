# Environment variables

| Variable | Browser exposed | Required | Purpose |
|---|---:|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Public Supabase client key; RLS remains the security boundary |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | Canonical app URL and recovery callback base |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server workflows | Supabase service key; never expose or commit |
| `RATE_LIMIT_MAX_REQUESTS` | No | Optional | Future edge/API rate limit configuration |
| `RATE_LIMIT_WINDOW_SECONDS` | No | Optional | Future edge/API rate limit window |

Keep separate values for local, staging, and production. Store Vercel values in the Vercel project environment settings and Supabase secrets in Supabase/secret management. Do not include secrets in screenshots, docs, tickets, or GitHub issues.
