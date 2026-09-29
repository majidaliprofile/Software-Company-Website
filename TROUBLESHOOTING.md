# Troubleshooting

## `NEXT_PUBLIC_SUPABASE_URL` missing

Copy `.env.example` to `.env.local`, fill every required value, stop the dev server, and run `npm run dev` again.

## Login succeeds but admin is rejected

Confirm the Auth user's UUID exists in `public.profiles`, `role='ADMIN'`, and `is_active=true`. Check that the browser is using the same Supabase project as the migration.

## Reset email does not arrive

Configure the redirect URL in Supabase Authentication, configure SMTP, check spam, and verify the email is the Auth user's exact email.

## RLS errors

Do not disable RLS to make a query work. Check the current session, table policy, and whether the operation is supposed to use a server-only admin workflow.

## Camera or microphone fails

Use HTTPS or localhost, confirm browser permissions, close other apps using the camera, and try a supported Chromium-based browser. Screen sharing requires a user gesture.

## Recording upload fails

Check the private `recordings` bucket exists, storage policies are present, the user owns the attempt, and network/storage quotas are available. Do not make the bucket public as a workaround.

## Assessment says expired

The server's `expires_at` is authoritative. Check the test duration, system time only for display issues, and the attempt row in Supabase. Never extend time by editing the browser clock.
