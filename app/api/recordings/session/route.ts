import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ attemptId: z.string().uuid(), kind: z.enum(["CAMERA", "SCREEN"]) });

// Registers a recording (metadata only). The video itself is uploaded by the browser straight to storage.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid recording session." }, { status: 400 });
  const { attemptId, kind } = parsed.data;

  const { data: existing } = await supabase.from("recording_sessions").select("id").eq("attempt_id", attemptId).eq("student_id", user.id).eq("kind", kind).limit(1);
  if (existing?.length) return NextResponse.json({ ok: true, id: existing[0].id });

  const { data, error } = await supabase.from("recording_sessions").insert({ attempt_id: attemptId, student_id: user.id, kind, status: "ACTIVE" }).select("id").single();
  if (error) return NextResponse.json({ error: "Recording session could not be registered." }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
