-- Fix: admin inserts/updates/deletes into questions and question_options were being
-- rejected by row-level security. 0001 only created SELECT policies for these two
-- tables; no policy allowed writes at all (not even for admins), so test creation
-- failed with "new row violates row-level security policy for table \"questions\"".
-- This mirrors the tests_admin_write / assignments_admin_write pattern already used
-- for every other admin-managed table.

create policy questions_admin_write on public.questions for all using (public.is_admin()) with check (public.is_admin());
create policy question_options_admin_write on public.question_options for all using (public.is_admin()) with check (public.is_admin());
