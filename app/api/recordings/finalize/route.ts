import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const { attemptId, counts } = await request.json() as { attemptId?: string; counts?: Record<string, number> };
  if (!attemptId) return NextResponse.json({ error: "Attempt is required." }, { status: 400 });

  const endedAt = new Date().toISOString();
  const kinds = ["CAMERA", "SCREEN"] as const;
  for (const kind of kinds) {
    const count = Number(counts?.[kind]);
    const patch: Record<string, unknown> = { status: "COMPLETED", ended_at: endedAt };
    if (Number.isFinite(count) && count >= 0) patch.chunk_count = Math.floor(count);
    const { error } = await supabase.from("recording_sessions").update(patch).eq("attempt_id", attemptId).eq("student_id", user.id).eq("kind", kind);
    if (error) return NextResponse.json({ error: "Recording session could not be finalized." }, { status: 400 });
  }
  // Recordings made by the older single-file recorder.
  await supabase.from("recording_sessions").update({ status: "COMPLETED", ended_at: endedAt }).eq("attempt_id", attemptId).eq("student_id", user.id).eq("kind", "COMBINED");
  return NextResponse.json({ ok: true });
}
