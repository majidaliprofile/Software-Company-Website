import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { Preflight } from "@/components/Preflight";

export default async function AssessmentInstructions({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const { supabase, user } = await requireRole("STUDENT");
  const { data: raw } = await supabase.rpc("get_assignment_for_student", { p_assignment_id: assignmentId });
  const a = raw as { id: string; status: string; test: { id: string; title: string; instructions: string | null; duration_minutes: number; status: string; starts_at: string | null; ends_at: string | null } } | null;
  const test = a?.test;
  if (!a || test?.status !== "PUBLISHED") notFound();

  if (a.status === "COMPLETED") {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/student" className="text-sm font-medium text-blue-700">← Back to assessments</Link>
        <Card className="mt-5 p-7 text-center">
          <h1 className="text-xl font-bold">{test.title} has already been submitted</h1>
          <p className="mt-2 text-sm text-slate-500">Each assessment can only be attempted once. Contact your administrator if you believe this is a mistake.</p>
        </Card>
      </div>
    );
  }

  const now = Date.now();
  if (test.starts_at && now < new Date(test.starts_at).getTime()) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/student" className="text-sm font-medium text-blue-700">← Back to assessments</Link>
        <Card className="mt-5 p-7 text-center">
          <h1 className="text-xl font-bold">{test.title} isn't open yet</h1>
          <p className="mt-2 text-sm text-slate-500">This assessment opens on {new Date(test.starts_at).toLocaleString()}. Come back after that time.</p>
        </Card>
      </div>
    );
  }
  if (test.ends_at && now > new Date(test.ends_at).getTime()) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/student" className="text-sm font-medium text-blue-700">← Back to assessments</Link>
        <Card className="mt-5 p-7 text-center">
          <h1 className="text-xl font-bold">{test.title} is closed</h1>
          <p className="mt-2 text-sm text-slate-500">This assessment closed on {new Date(test.ends_at).toLocaleString()} and can no longer be started.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/student" className="text-sm font-medium text-blue-700">← Back to assessments</Link>
      <Card className="mt-5 p-7">
        <h1 className="text-3xl font-bold">{test.title}</h1>
        <p className="mt-2 text-slate-500">{test.duration_minutes} minutes · One question at a time</p>
        <div className="prose-lite mt-8 whitespace-pre-wrap text-sm">{test.instructions ?? "Read each question carefully. Once submitted, an answer cannot be changed."}</div>
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="font-semibold">Before you begin</h2>
          <p className="mt-2 text-sm text-slate-500">Camera, microphone, screen sharing, a supported browser, HTTPS, and recording initialization are required. The timer does not start until every check passes.</p>
          <Preflight assignmentId={assignmentId} />
        </div>
      </Card>
    </div>
  );
}
