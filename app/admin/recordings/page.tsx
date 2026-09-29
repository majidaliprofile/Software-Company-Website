import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { RecordingsTable, type RecordingRow } from "@/components/RecordingsTable";

export default async function Recordings() {
  const { supabase } = await requireRole("ADMIN");
  await supabase.rpc("finalize_expired_attempts");

  // Every recording file that exists in storage, grouped per attempt — old and new, all students.
  const { data: usage, error } = await supabase.rpc("admin_recording_usage");
  const usageRows = (usage ?? []) as { attempt_id: string; files: number; bytes: number; last_upload: string }[];
  const ids = usageRows.map((u) => u.attempt_id);
  const { data: attempts } = ids.length
    ? await supabase.from("attempts").select("id,status,started_at,profiles!inner(full_name,email),tests!inner(title)").in("id", ids)
    : { data: [] as any[] };
  const byId = new Map<string, any>(((attempts ?? []) as any[]).map((a) => [a.id as string, a] as [string, any]));

  const rows: RecordingRow[] = usageRows
    .map((u) => {
      const a = byId.get(u.attempt_id);
      return {
        attemptId: u.attempt_id,
        student: a?.profiles?.full_name ?? a?.profiles?.email ?? "(deleted attempt)",
        test: a?.tests?.title ?? "—",
        started: a ? new Date(a.started_at).toLocaleString() : "—",
        status: a?.status ?? "",
        files: Number(u.files),
        bytes: Number(u.bytes),
        sort: a ? new Date(a.started_at).getTime() : 0,
      };
    })
    .sort((x, y) => y.sort - x.sort)
    .map(({ sort, ...row }) => row);
  const total = rows.reduce((sum, r) => sum + r.bytes, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Recordings</h1>
      <p className="mt-1 text-sm text-slate-500">All camera and screen recordings of every student, old and new. Nothing is deleted automatically — you choose what to remove. Storage used: <b>{(total / 1024 ** 2).toFixed(1)} MB</b> in {rows.length} attempt(s).</p>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Recordings could not be listed: {error.message}. Run migration 0006 in Supabase.</p>}
      <Card className="mt-8 overflow-hidden"><RecordingsTable rows={rows} /></Card>
    </div>
  );
}
