import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card, Badge } from "@/components/ui";

export default async function Attempts() {
  const { supabase } = await requireRole("ADMIN");
  // Close attempts whose time ran out but were never submitted by the student's browser.
  await supabase.rpc("finalize_expired_attempts");
  const { data } = await supabase
    .from("attempts")
    .select("id,status,started_at,submitted_at,score,total_points,profiles!inner(full_name,email),tests!inner(title)")
    .order("started_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as any[];

  // Theory answers stay with awarded_points = null until an admin grades them.
  const ids = rows.map((r) => r.id);
  const { data: ungraded } = ids.length
    ? await supabase.from("answers").select("attempt_id").in("attempt_id", ids).is("awarded_points", null)
    : { data: [] as any[] };
  const needsGrading = new Set((ungraded ?? []).map((row: any) => row.attempt_id));

  return (
    <div>
      <h1 className="text-2xl font-bold">Attempts & results</h1>
      <p className="mt-1 text-sm text-slate-500">Open an attempt to see the student's answers, grade theory questions, and watch the recording.</p>
      <Card className="mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Test</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-4">{r.profiles?.full_name ?? r.profiles?.email}</td>
                  <td className="px-5 py-4">{r.tests?.title}</td>
                  <td className="px-5 py-4">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</td>
                  <td className="px-5 py-4">{r.status === "IN_PROGRESS" ? "In progress" : `${r.score ?? 0}/${r.total_points}`}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={r.status === "IN_PROGRESS" ? "amber" : "green"}>{r.status.replace("_", " ")}</Badge>
                      {needsGrading.has(r.id) && <Badge tone="amber">Needs grading</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-4"><Link href={`/admin/attempts/${r.id}` as any} className="font-semibold text-blue-700">Review</Link></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No attempts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
