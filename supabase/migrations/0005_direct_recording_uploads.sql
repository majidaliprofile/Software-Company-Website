-- Recordings are now uploaded straight from the student's browser to Supabase Storage (not through Vercel),
-- as two separate recordings per attempt: camera + microphone, and screen.

-- 1) Each attempt can now have a CAMERA and a SCREEN recording session.
alter table public.recording_sessions add column if not exists kind text not null default 'COMBINED';
alter table public.recording_sessions drop constraint if exists recording_sessions_kind_check;
alter table public.recording_sessions add constraint recording_sessions_kind_check check (kind in ('CAMERA','SCREEN','COMBINED'));

-- 2) A student may only upload into their own folder, for their own attempt.
-- Path layout: YYYY/MM/DD/<student id>/<attempt id>/<file>
drop policy if exists storage_student_recordings_upload on storage.objects;
create policy storage_student_recordings_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'recordings'
  and (storage.foldername(objects.name))[4] = auth.uid()::text
  and exists (
    select 1 from public.attempts a
    where a.id::text = (storage.foldername(objects.name))[5]
      and a.student_id = auth.uid()
      and (a.submitted_at is null or a.submitted_at > now() - interval '2 minutes')
  )
);
