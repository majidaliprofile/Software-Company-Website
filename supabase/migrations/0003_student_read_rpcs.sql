-- Every one of these functions is SECURITY DEFINER: it runs with the privileges of the
-- function owner (bypassing RLS on the tables it touches internally) but hard-codes
-- `where student_id = auth.uid()` (or reaches a test only through a matching
-- assignment for auth.uid()), so a student can still only ever retrieve their own
-- data. This removes the dependency on tests_published_for_students /
-- questions_published_for_students for reads, which is the policy that was silently
-- returning zero rows for students despite the test being genuinely published.

create or replace function public.list_my_assignments()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', ta.id,
      'status', ta.status,
      'due_at', ta.due_at,
      'test', jsonb_build_object(
        'id', t.id, 'title', t.title, 'description', t.description,
        'duration_minutes', t.duration_minutes, 'status', t.status,
        'starts_at', t.starts_at, 'ends_at', t.ends_at
      )
    ) order by ta.assigned_at desc), '[]'::jsonb)
  into result
  from public.test_assignments ta
  join public.tests t on t.id = ta.test_id
  where ta.student_id = auth.uid();
  return result;
end;
$$;
grant execute on function public.list_my_assignments() to authenticated;

create or replace function public.get_assignment_for_student(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', ta.id, 'status', ta.status, 'due_at', ta.due_at,
    'test', jsonb_build_object(
      'id', t.id, 'title', t.title, 'description', t.description, 'instructions', t.instructions,
      'duration_minutes', t.duration_minutes, 'status', t.status, 'starts_at', t.starts_at, 'ends_at', t.ends_at
    )
  ) into result
  from public.test_assignments ta
  join public.tests t on t.id = ta.test_id
  where ta.id = p_assignment_id and ta.student_id = auth.uid();
  return result;
end;
$$;
grant execute on function public.get_assignment_for_student(uuid) to authenticated;

create or replace function public.get_take_questions(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_test_id uuid;
  result jsonb;
begin
  select t.id into v_test_id
  from public.test_assignments ta
  join public.tests t on t.id = ta.test_id
  where ta.id = p_assignment_id and ta.student_id = auth.uid();
  if v_test_id is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'order_index', q.order_index, 'type', q.type, 'prompt', q.prompt, 'points', q.points,
      'question_options', (
        select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label) order by o.option_key), '[]'::jsonb)
        from public.question_options o where o.question_id = q.id
      )
    ) order by q.order_index), '[]'::jsonb)
  into result
  from public.questions q
  where q.test_id = v_test_id and q.is_published = true;
  return result;
end;
$$;
grant execute on function public.get_take_questions(uuid) to authenticated;
