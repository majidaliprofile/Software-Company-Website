import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/api-auth";

const schema = z.object({ attemptIds: z.array(z.string().uuid()).min(1).max(50) });

// Deletes the recording FILES of the attempts the admin explicitly selected. Nothing is ever deleted
// automatically. Answers, scores and the attempt itself are kept — only the videos are removed.
export async function DELETE(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select at least one recording." }, { status: 400 });

  let removedFiles = 0;
  for (const attemptId of parsed.data.attemptIds) {
    const { data: objects, error: listError } = await auth.supabase.rpc("admin_recording_objects", { p_attempt_id: attemptId });
    if (listError) return NextResponse.json({ error: listError.message }, { status: 400 });
    const names = ((objects ?? []) as { name: string }[]).map((o) => o.name);
    for (let i = 0; i < names.length; i += 100) {
      const { error } = await auth.supabase.storage.from("recordings").remove(names.slice(i, i + 100));
      if (error) return NextResponse.json({ error: `Some files could not be removed: ${error.message}` }, { status: 400 });
    }
    removedFiles += names.length;
    await auth.supabase.from("recording_sessions").delete().eq("attempt_id", attemptId);
    await auth.supabase.from("activity_logs").insert({ actor_id: auth.user!.id, attempt_id: attemptId, event_type: "RECORDINGS_DELETED_BY_ADMIN", metadata: { files: names.length } });
  }
  return NextResponse.json({ ok: true, removedFiles });
}
