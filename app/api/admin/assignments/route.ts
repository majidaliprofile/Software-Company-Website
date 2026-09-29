import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/api-auth";

const schema = z.object({
  testId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1),
  dueAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a published test and at least one student." }, { status: 400 });
  const { data: test } = await auth.supabase.from("tests").select("id,status").eq("id", parsed.data.testId).single();
  if (!test || test.status !== "PUBLISHED") return NextResponse.json({ error: "Only published tests can be assigned." }, { status: 400 });
  const rows = parsed.data.studentIds.map((studentId) => ({ student_id: studentId, test_id: parsed.data.testId, due_at: parsed.data.dueAt ?? null, status: "ASSIGNED" }));
  const { error } = await auth.supabase.from("test_assignments").upsert(rows, { onConflict: "student_id,test_id" });
  if (error) return NextResponse.json({ error: "Assignments could not be saved." }, { status: 400 });
  return NextResponse.json({ ok: true, count: rows.length }, { status: 201 });
}