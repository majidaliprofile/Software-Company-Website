# Administrator guide

## Sign in

Open `/admin/login`, enter the Supabase Auth email/password, and confirm that a student account is rejected from `/admin`.

## Manage students

Create student Auth users using a server-only admin workflow. The user's profile must be `STUDENT` and `is_active=true`. Use password reset, not password visibility, for recovery. Disable access by setting `is_active=false`.

## Manage tests

Create a test as `DRAFT`, add questions, review imported content, set duration/passing score/result visibility, then move it through `READY` to `PUBLISHED`. Never publish automatically imported or low-confidence questions.

## Assignments

Assign a published test to one student, a selection, or all active students. Each assignment stores student, test, assigned timestamp, due date, and status.

## Review attempts

MCQs are scored by the server. Theory answers remain available for manual review with awarded points and a reviewer comment. The final score must update only through an authorized admin review operation.

## Account recovery

There is no hidden backdoor. Use Supabase **Authentication → Users** to send a reset email or use the `/admin/forgot-password` flow. If the administrator loses access, a workspace owner can verify identity, reset the account in Supabase, and reassign `ADMIN` to the profile. Rotate credentials after recovery.
