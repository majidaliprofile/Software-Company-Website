-- 1) Root cause of "assessment unavailable" for students.
-- In tests_published_for_students the subquery used an unqualified `id`, which SQL binds to the
-- innermost table (test_assignments.id), so the condition was `a.test_id = a.id` and never true.
drop policy if exists tests_published_for_students on public.tests;
create policy tests_published_for_students on public.tests for select using (
  (status = 'PUBLISHED' and exists (
    select 1 from public.test_assignments a where a.test_id = tests.id and a.student_id = auth.uid()
  )) or public.is_admin()
);

-- 2) Recording chunk rows could never be inserted by students (only a SELECT policy existed).
drop policy if exists recording_chunks_student_insert on public.recording_chunks;
create policy recording_chunks_student_insert on public.recording_chunks for insert to authenticated with check (
  exists (select 1 from public.recording_sessions s where s.id = recording_chunks.session_id and s.student_id = auth.uid())
);

-- 3) Admin: list recording files for an attempt straight from storage, so recordings uploaded
-- before this fix (which have no recording_chunks rows) can still be played back.
create or replace function public.admin_recording_objects(p_attempt_id uuid)
returns table (name text, size bigint)
language plpgsql security definer set search_path = public, storage stable as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required'; end if;
  return query
    select o.name, coalesce((o.metadata->>'size')::bigint, 0)
    from storage.objects o
    where o.bucket_id = 'recordings' and o.name like '%/' || p_attempt_id::text || '/%'
    order by o.name;
end;
$$;
grant execute on function public.admin_recording_objects(uuid) to authenticated;

-- 4) Admin: grade a theory answer and recompute the attempt score.
create or replace function public.review_answer(p_attempt_id uuid, p_question_id uuid, p_points numeric, p_comment text)
returns numeric
language plpgsql security definer set search_path = public as $$
declare q public.questions; new_score numeric;
begin
  if not public.is_admin() then raise exception 'Administrator access is required'; end if;
  select * into q from public.questions
    where id = p_question_id and test_id = (select test_id from public.attempts where id = p_attempt_id);
  if q.id is null then raise exception 'Question not found for this attempt'; end if;
  if q.type <> 'THEORY' then raise exception 'Only theory answers are graded manually'; end if;
  if p_points < 0 or p_points > q.points then raise exception 'Points must be between 0 and %', q.points; end if;
  if not exists (select 1 from public.answers where attempt_id = p_attempt_id and question_id = p_question_id) then
    raise exception 'The student did not answer this question';
  end if;
  insert into public.test_reviews(attempt_id, question_id, reviewer_id, awarded_points, comment)
    values (p_attempt_id, p_question_id, auth.uid(), p_points, nullif(trim(coalesce(p_comment, '')), ''))
    on conflict (attempt_id, question_id) do update
      set awarded_points = excluded.awarded_points, comment = excluded.comment,
          reviewer_id = excluded.reviewer_id, reviewed_at = now();
  update public.answers set awarded_points = p_points where attempt_id = p_attempt_id and question_id = p_question_id;
  select coalesce(sum(awarded_points), 0) into new_score from public.answers where attempt_id = p_attempt_id;
  update public.attempts set score = new_score where id = p_attempt_id;
  return new_score;
end;
$$;
grant execute on function public.review_answer(uuid, uuid, numeric, text) to authenticated;
