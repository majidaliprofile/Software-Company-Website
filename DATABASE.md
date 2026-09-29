# Database and migration guide

The authoritative schema is `supabase/migrations/0001_initial.sql`.

## Core relationships

`profiles → test_assignments → attempts → answers`, with `recording_sessions` and `activity_logs` attached to attempts. Tests contain ordered questions, and MCQ questions contain options.

## Migration rules

- Treat migration files as append-only after staging validation.
- Create a new numbered migration for schema changes.
- Back up production before applying a migration.
- Apply to staging first, then production.
- Never edit a production migration in place.

## RLS rules

Students can read only their own profile, assignments, published assigned tests/questions, own attempts/answers, own recording metadata, and own activity. Administrators can manage operational records. Sensitive state changes happen through Postgres RPCs that re-check `auth.uid()`.

## Admin role assignment

The initial admin is created through Supabase Auth, then the corresponding profile is changed to `ADMIN` using the SQL in `SETUP.md`. Do not store roles in client-controlled metadata.

## Backup and recovery

Use Supabase's database backups or scheduled `pg_dump` in a secure secret-managed environment. Back up migration files in GitHub, but never back up secrets in GitHub. For recordings, configure a retention policy and an external archival strategy if records must be retained beyond Supabase storage limits.
