import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card, Badge } from "@/components/ui";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileUp,
  Timer,
  UserPlus,
  Users,
  Video,
} from "lucide-react";

const shortcuts = [
  ["/admin/students", "Manage students", "Create, disable, and review student access.", Users],
  ["/admin/tests", "Manage tests", "Create, review, publish, and close assessments.", ClipboardList],
  ["/admin/assignments", "Assign assessments", "Connect published tests to students.", UserPlus],
  ["/admin/import", "Import questions", "Preview PDF, DOCX, or TXT question papers.", FileUp],
  ["/admin/attempts", "Review attempts", "Inspect answers, scores, and submissions.", BookOpenCheck],
  ["/admin/recordings", "View recordings", "Open private recording metadata and review tools.", Video],
  ["/admin/activity", "Activity logs", "Trace important assessment events.", Activity],
] as const;

export default async function AdminDashboard() {
  const { supabase } = await requireRole("ADMIN");
  const [
    { count: students },
    { count: activeStudents },
    { count: tests },
    { count: published },
    { count: activeAttempts },
    { count: completed },
    { count: pending },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "STUDENT"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "STUDENT").eq("is_active", true),
    supabase.from("tests").select("id", { count: "exact", head: true }),
    supabase.from("tests").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("status", "SUBMITTED"),
    supabase.from("test_assignments").select("id", { count: "exact", head: true }).eq("status", "ASSIGNED"),
  ]);

  const metrics = [
    ["Total students", students ?? 0, Users],
    ["Active students", activeStudents ?? 0, Users],
    ["Total tests", tests ?? 0, ClipboardList],
    ["Published tests", published ?? 0, CheckCircle2],
    ["Active attempts", activeAttempts ?? 0, Timer],
    ["Completed attempts", completed ?? 0, CheckCircle2],
    ["Pending assignments", pending ?? 0, ClipboardList],
  ] as const;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live operational overview from Supabase.
          </p>
        </div>
        <Link
          href="/admin/tests"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Open tests <ArrowRight size={17} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
              </div>
              <Icon className="text-blue-600" size={20} />
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Common administration tasks and operational views.
          </p>
        </div>
        <Badge tone="blue">Database-backed</Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map(([href, title, description, Icon]) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:border-blue-300">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                </div>
                <Icon className="shrink-0 text-blue-600" size={21} />
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                Open <ArrowRight size={15} />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Recent activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Assessment events will appear here as students use the platform.
            </p>
          </div>
          <Link href="/admin/activity" className="text-sm font-semibold text-blue-700">
            View logs
          </Link>
        </div>
      </Card>
    </div>
  );
}