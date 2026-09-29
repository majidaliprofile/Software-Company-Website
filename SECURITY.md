# Security model

## Non-negotiable rules

- Passwords are managed by Supabase Auth; this app never reads or stores them.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- RLS is enabled on all application tables and storage access is private.
- The client never supplies authoritative student ID, role, score, correct answer, or expiry.
- PostgreSQL functions derive identity from `auth.uid()`, calculate expiry from the test duration, lock answers, and calculate MCQ score.
- Signed URLs must be generated only by an authenticated admin server operation when the recording viewer is added.
- Do not publish imported questions automatically; imported rows must begin with `is_published=false` and `needs_review=true` when confidence is low.

## Threats addressed

- **Student accessing another student's data:** RLS and server-side ownership checks.
- **Answer tampering:** unique answer row plus locked RPC path.
- **Timer manipulation:** expiry is calculated from the database server timestamp and checked in the RPC.
- **Role spoofing:** role lives in `profiles` and is checked server-side.
- **Public recording access:** buckets are private; paths are not public URLs.
- **Credential leakage:** `.gitignore`, environment separation, and no hard-coded passwords.

## Before production

Enable Supabase MFA for administrators, configure SMTP, restrict admin creation, add rate limiting/WAF at the edge, monitor failed auth, and run the complete checklist. Consider a dedicated recording upload service if chunk volumes exceed what the application route can reliably handle.
