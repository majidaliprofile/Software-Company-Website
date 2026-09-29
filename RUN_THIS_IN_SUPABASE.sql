-- 0006: fixes for "stuck IN PROGRESS", missing activity log, and admin-controlled recording cleanup.
-- Safe to run more than once. NOTHING here deletes any existing recording, attempt or answer.

-- 1) Activity log inserts were silently rejected by row-level security (no INSERT policy existed),
--    which is why "Activity during this attempt" was always empty.
drop policy if exists activity_student_insert on public.activity_logs;
create policy activity_student_insert on public.activity_logs for insert to authenticated
  with check (actor_id = auth.uid() and (student_id is null or student_id = auth.uid()));

-- 2) Admin may remove recording session rows (only when an admin explicitly deletes a recording).
drop policy if exists recording_sessions_admin_delete on public.recording_sessions;
create policy recording_sessions_admin_delete on public.recording_sessions for delete to authenticated
  using (public.is_admin());

-- 3) Close attempts whose time is over but which were never finalized (browser closed, network lost,
--    screen sharing stopped, etc). Score is computed from the answers already saved.
create or replace function public.finalize_expired_attempts()
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with closed as (
    update public.attempts a
       set status = 'AUTO_SUBMITTED',
           submitted_at = coalesce(a.submitted_at, a.expires_at),
           locked_at = coalesce(a.locked_at, now()),
           automatic_submission = true,
           score = (select coalesce(sum(awarded_points), 0) from public.answers where attempt_id = a.id)
     where a.status = 'IN_PROGRESS' and a.expires_at < now() - interval '1 minute'
       and (public.is_admin() or a.student_id = auth.uid())
    returning a.assignment_id, a.id
  ), asg as (
    update public.test_assignments ta set status = 'COMPLETED'
     where ta.id in (select assignment_id from closed) returning 1
  ), rec as (
    update public.recording_sessions rs set status = 'COMPLETED', ended_at = coalesce(rs.ended_at, now())
     where rs.attempt_id in (select id from closed) and rs.status = 'ACTIVE' returning 1
  )
  select count(*) into n from closed;
  return coalesce(n, 0);
end;
$$;
grant execute on function public.finalize_expired_attempts() to authenticated;

-- 4) Admin: storage used per attempt (files + bytes), so the admin can decide what to delete.
create or replace function public.admin_recording_usage()
returns table (attempt_id uuid, files bigint, bytes bigint, last_upload timestamptz)
language plpgsql security definer set search_path = public, storage stable as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required'; end if;
  return query
    select (storage.foldername(o.name))[5]::uuid,
           count(*)::bigint,
           coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint,
           max(o.created_at)
    from storage.objects o
    where o.bucket_id = 'recordings'
      and (storage.foldername(o.name))[5] ~ '^[0-9a-fA-F-]{36}$'
    group by 1;
end;
$$;
grant execute on function public.admin_recording_usage() to authenticated;
