import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/api-auth";

const schema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  points: z.number().min(0),
  comment: z.string().max(2000).optional().default(""),
});

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid points for this answer." }, { status: 400 });
  const { attemptId, questionId, points, comment } = parsed.data;
  const { data, error } = await auth.supabase.rpc("review_answer", {
    p_attempt_id: attemptId, p_question_id: questionId, p_points: points, p_comment: comment,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, score: data });
}
