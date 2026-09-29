import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  attemptId: z.string().uuid(),
  eventType: z.enum(["RECORDING_STREAM_STOPPED", "RECORDING_UPLOAD_PROBLEM", "RECORDING_STARTED"]),
  metadata: z.record(z.any()).optional().default({}),
});

// Lets the student's browser write a small activity-log line (e.g. "screen sharing stopped").
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const { attemptId, eventType, metadata } = parsed.data;
  const { error } = await supabase.from("activity_logs").insert({ actor_id: user.id, student_id: user.id, attempt_id: attemptId, event_type: eventType, metadata });
  if (error) return NextResponse.json({ error: "Event could not be logged." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
