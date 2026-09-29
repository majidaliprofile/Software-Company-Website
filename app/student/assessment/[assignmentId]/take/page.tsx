import { requireRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AssessmentClient } from "@/components/AssessmentClient";

export default async function Take({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const { supabase, user } = await requireRole("STUDENT");
  // SECURITY DEFINER RPCs (see 0003_student_read_rpcs.sql) instead of RLS-scoped
  // selects: those were silently returning no rows for students even for a
  // genuinely published, in-window test.
  const { data: raw } = await supabase.rpc("get_assignment_for_student", { p_assignment_id: assignmentId });
  const a = raw as { id: string; status: string; test: { id: string; title: string; duration_minutes: number; status: string } } | null;
  const test = a?.test;
  if (!a || test?.status !== "PUBLISHED") notFound();
  const { data: questions } = await supabase.rpc("get_take_questions", { p_assignment_id: assignmentId });
  return <AssessmentClient assignmentId={assignmentId} userId={user.id} title={test.title} durationMinutes={test.duration_minutes} questions={(questions ?? []) as any} />;
}
