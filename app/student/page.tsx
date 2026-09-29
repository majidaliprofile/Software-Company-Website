import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card, Badge } from "@/components/ui";

export default async function StudentDashboard() {
  const { supabase, user } = await requireRole("STUDENT");
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  // Reads via a SECURITY DEFINER RPC rather than a plain RLS-scoped select: the
  // tests_published_for_students policy was silently excluding the test row for
  // students in some cases even when it was genuinely published and in-window.
  const { data: raw, error } = await supabase.rpc("list_my_assignments");
  const rows: { id: string; status: string; due_at: string | null; test: { id: string; title: string; description: string | null; duration_minutes: number; status: string; starts_at: string | null; ends_at: string | null } | null }[] = raw ?? [];

  const now = Date.now();
  const available = rows.filter((r) => r.status !== "COMPLETED");
  const completed = rows.filter((r) => r.status === "COMPLETED");

  function availability(test: { starts_at: string | null; ends_at: string | null } | null) {
    if (!test) return { state: "unavailable" as const, label: "No longer available" };
    if (test.starts_at && now < new Date(test.starts_at).getTime()) return { state: "upcoming" as const, label: `Opens ${new Date(test.starts_at).toLocaleString()}` };
    if (test.ends_at && now > new Date(test.ends_at).getTime()) return { state: "closed" as const, label: `Closed ${new Date(test.ends_at).toLocaleString()}` };
    return { state: "open" as const, label: "" };
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
        <p className="mt-1 text-sm text-slate-500">Your assigned assessments are listed below.</p>
      </div>

      {error && <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">Your assessments could not be loaded right now. Please refresh the page or contact your administrator.</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        {available.map((r) => {
          const av = availability(r.test);
          return (
            <Card key={r.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{r.test?.title ?? "Assessment unavailable"}</h2>
                  <p className="mt-2 text-sm text-slate-500">{r.test?.description ?? "This assessment is no longer available. Contact your administrator."}</p>
                </div>
                <Badge tone={r.status === "IN_PROGRESS" ? "amber" : av.state === "open" ? "blue" : "red"}>
                  {av.state === "open" ? r.status.replace("_", " ") : av.label}
                </Badge>
              </div>
              {r.test && (
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>{r.test.duration_minutes} minutes</span>
                  {r.due_at && <span>Due {new Date(r.due_at).toLocaleString()}</span>}
                </div>
              )}
              {av.state === "open" && r.test ? (
                <Link href={`/student/assessment/${r.id}`} className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  {r.status === "IN_PROGRESS" ? "Resume assessment" : "View instructions"}
                </Link>
              ) : (
                <span className="mt-6 inline-block rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500">{av.label || "Not available"}</span>
              )}
            </Card>
          );
        })}
        {!available.length && !error && (
          <Card className="p-8 lg:col-span-2">
            <p className="text-slate-500">There are no assigned assessments right now.</p>
          </Card>
        )}
      </div>

      {completed.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Completed</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {completed.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-4">
                <span className="font-medium text-slate-700">{r.test?.title ?? "Assessment"}</span>
                <Badge tone="green">Completed</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
