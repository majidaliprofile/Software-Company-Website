import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/api-auth";

const questionSchema = z.object({
  prompt: z.string().trim().min(3).max(10000),
  type: z.enum(["MCQ", "THEORY"]),
  points: z.number().positive().max(1000),
  options: z.array(z.string().trim().min(1).max(1000)).max(4).default([]),
  correctOption: z.number().int().min(0).max(3).nullable().default(null),
});
const createTestSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(5000).optional().default(""),
  instructions: z.string().max(10000).optional().default(""),
  durationMinutes: z.number().int().min(1).max(600),
  passingScore: z.number().min(0).max(100),
  resultVisibility: z.enum(["IMMEDIATE", "AFTER_REVIEW", "NEVER"]),
  publishNow: z.boolean().default(false),
  startsAt: z.string().datetime().nullable().optional().default(null),
  endsAt: z.string().datetime().nullable().optional().default(null),
  questions: z.array(questionSchema).min(1).max(200),
}).refine((v) => !v.startsAt || !v.endsAt || new Date(v.startsAt) < new Date(v.endsAt), { message: "The opening time must be before the closing time.", path: ["endsAt"] });

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = createTestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const input = parsed.data;
  const { data: test, error: testError } = await auth.supabase.from("tests").insert({
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    duration_minutes: input.durationMinutes,
    passing_score: input.passingScore,
    result_visibility: input.resultVisibility,
    status: input.publishNow ? "PUBLISHED" : "DRAFT",
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    created_by: auth.user!.id,
  }).select("id,title,status").single();
  if (testError || !test) return NextResponse.json({ error: testError?.message ?? "Test could not be created." }, { status: 400 });

  for (const [index, question] of input.questions.entries()) {
    const { data: created, error: questionError } = await auth.supabase.from("questions").insert({
      test_id: test.id,
      order_index: index + 1,
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      is_published: input.publishNow,
      needs_review: false,
    }).select("id").single();
    if (questionError || !created) {
      await auth.supabase.from("tests").delete().eq("id", test.id);
      return NextResponse.json({ error: questionError?.message ?? "A question could not be created." }, { status: 400 });
    }
    if (question.type === "MCQ") {
      const options = question.options.map((label, optionIndex) => ({
        question_id: created.id,
        option_key: String.fromCharCode(65 + optionIndex),
        label,
      }));
      const { data: createdOptions, error: optionError } = await auth.supabase.from("question_options").insert(options).select("id");
      if (optionError || !createdOptions || createdOptions.length < 2) {
        await auth.supabase.from("tests").delete().eq("id", test.id);
        return NextResponse.json({ error: "MCQ questions require at least two options." }, { status: 400 });
      }
      if (question.correctOption !== null && createdOptions[question.correctOption]) {
        await auth.supabase.from("questions").update({ correct_option_id: createdOptions[question.correctOption].id }).eq("id", created.id);
      }
    }
  }
  return NextResponse.json({ test }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const body = await request.json() as { testId?: string };
  if (!body.testId) return NextResponse.json({ error: "Test is required." }, { status: 400 });
  const { count, error: countError } = await auth.supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("test_id", body.testId);
  if (countError) return NextResponse.json({ error: "Test could not be deleted." }, { status: 400 });
  if (count && count > 0) {
    return NextResponse.json({ error: "This test already has student attempts, so it can't be deleted. Close it instead to stop new attempts." }, { status: 409 });
  }
  // Cascades handle questions, question_options and test_assignments — assigned students
  // simply stop seeing this test once it's gone.
  const { error } = await auth.supabase.from("tests").delete().eq("id", body.testId);
  if (error) return NextResponse.json({ error: error.message ?? "Test could not be deleted." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const body = await request.json() as { testId?: string; status?: "DRAFT" | "READY" | "PUBLISHED" | "CLOSED" };
  if (!body.testId || !body.status) return NextResponse.json({ error: "Test and status are required." }, { status: 400 });
  const { error } = await auth.supabase.from("tests").update({ status: body.status }).eq("id", body.testId);
  if (error) return NextResponse.json({ error: "Test status could not be updated." }, { status: 400 });
  if (body.status === "PUBLISHED") await auth.supabase.from("questions").update({ is_published: true }).eq("test_id", body.testId);
  return NextResponse.json({ ok: true });
}