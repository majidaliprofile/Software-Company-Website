import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { GradeForm } from "@/components/GradeForm";
import { RecordingPlayer } from "@/components/RecordingPlayer";

type Option = { id: string; label: string; option_key: string };
type Question = { id: string; order_index: number; type: "MCQ" | "THEORY"; prompt: string; points: number; correct_option_id: string | null; question_options: Option[] };

type Kind = "camera" | "screen" | "legacy";

// New recordings: camera-<segment>-000001.webm / screen-<segment>-000001.webm (a new segment starts if the
// student reloaded and re-shared). Older: camera-000001.webm, or just 000001.webm (single-file format).
function parseRecording(name: string): { kind: Kind; segment: string; index: number } {
  const base = name.split("/").pop() ?? name;
  const seg = base.match(/^(camera|screen)-([a-z0-9]+)-(\d+)/);
  if (seg) return { kind: seg[1] as Kind, segment: seg[2], index: parseInt(seg[3], 10) };
  const match = base.match(/^(camera|screen)-(\d+)/);
  if (match) return { kind: match[1] as Kind, segment: "", index: parseInt(match[2], 10) };
  const n = parseInt(base, 10);
  return { kind: "legacy", segment: "", index: Number.isNaN(n) ? 0 : n };
}

export default async function AttemptDetail({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { supabase } = await requireRole("ADMIN");
  await supabase.rpc("finalize_expired_attempts");

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id,test_id,status,started_at,submitted_at,score,total_points,automatic_submission,profiles!inner(full_name,email),tests!inner(title,passing_score)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) notFound();
  const a = attempt as any;

  const [{ data: questionRows }, { data: answerRows }, { data: reviewRows }, { data: activityRows }, { data: sessionRows }, objects] = await Promise.all([
    supabase.from("questions").select("id,order_index,type,prompt,points,correct_option_id").eq("test_id", a.test_id).eq("is_published", true).order("order_index"),
    supabase.from("answers").select("question_id,selected_option_id,answer_text,awarded_points").eq("attempt_id", attemptId),
    supabase.from("test_reviews").select("question_id,comment").eq("attempt_id", attemptId),
    supabase.from("activity_logs").select("id,event_type,created_at,metadata").eq("attempt_id", attemptId).order("created_at", { ascending: true }).limit(200),
    supabase.from("recording_sessions").select("id,status,started_at,ended_at").eq("attempt_id", attemptId),
    supabase.rpc("admin_recording_objects", { p_attempt_id: attemptId }),
  ]);

  // Options are fetched separately: embedding question_options inside questions is ambiguous in PostgREST
  // (questions.correct_option_id also points at question_options), which made the whole question list come back empty.
  const questionIds = (questionRows ?? []).map((q: any) => q.id as string);
  const { data: optionRows } = questionIds.length
    ? await supabase.from("question_options").select("id,question_id,label,option_key").in("question_id", questionIds)
    : { data: [] as any[] };
  const questions = ((questionRows ?? []) as any[]).map((q) => ({
    ...q,
    question_options: ((optionRows ?? []) as any[]).filter((o) => o.question_id === q.id).sort((x, y) => String(x.option_key).localeCompare(String(y.option_key))),
  })) as Question[];
  const answers = new Map<string, any>(((answerRows ?? []) as any[]).map((row) => [row.question_id as string, row] as [string, any]));
  const reviews = new Map<string, string>(((reviewRows ?? []) as any[]).map((row) => [row.question_id as string, (row.comment ?? "") as string] as [string, string]));

  const recordingFiles = ((objects.data ?? []) as { name: string; size: number }[]).map((f) => ({ ...f, ...parseRecording(f.name) }));
  const nameToUrl = new Map<string, string>();
  if (recordingFiles.length) {
    const { data: signed } = await supabase.storage.from("recordings").createSignedUrls(recordingFiles.map((f) => f.name), 3600);
    (signed ?? []).forEach((item) => { if (item.path && item.signedUrl) nameToUrl.set(item.path, item.signedUrl); });
  }
  const order: Kind[] = ["camera", "screen", "legacy"];
  const groupKeys = [...new Set(recordingFiles.map((f) => `${f.kind}|${f.segment}`))].sort((x, y) => {
    const [kx, sx] = x.split("|"); const [ky, sy] = y.split("|");
    return order.indexOf(kx as Kind) - order.indexOf(ky as Kind) || sx.localeCompare(sy);
  });
  const groups = groupKeys.map((key) => {
    const [kind, segment] = key.split("|") as [Kind, string];
    const files = recordingFiles.filter((f) => f.kind === kind && f.segment === segment).sort((x, y) => x.index - y.index);
    return {
      key,
      kind,
      part: groupKeys.filter((k) => k.startsWith(`${kind}|`)).indexOf(key) + 1,
      parts: groupKeys.filter((k) => k.startsWith(`${kind}|`)).length,
      urls: files.map((f) => nameToUrl.get(f.name)).filter(Boolean) as string[],
      mb: files.reduce((sum, f) => sum + Number(f.size ?? 0), 0) / (1024 * 1024),
    };
  }).filter((group) => group.urls.length);
  const groupLabel = (kind: Kind) => kind === "camera" ? "Camera & microphone" : kind === "screen" ? "Screen" : "Recording (older single-file format)";
  const needsGrading = questions.filter((q) => q.type === "THEORY" && answers.get(q.id) && answers.get(q.id).awarded_points === null).length;
  const student = a.profiles?.full_name ?? a.profiles?.email;
  const percent = a.total_points ? Math.round((Number(a.score ?? 0) / Number(a.total_points)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/attempts" className="text-sm font-medium text-blue-700">← Back to attempts</Link>
        <h1 className="mt-3 text-2xl font-bold">{a.tests?.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{student} · {a.profiles?.email}</p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs uppercase text-slate-500">Status</p><div className="mt-1"><Badge tone={a.status === "IN_PROGRESS" ? "amber" : "green"}>{a.status.replace("_", " ")}</Badge></div></div>
          <div><p className="text-xs uppercase text-slate-500">Score</p><p className="mt-1 font-semibold">{a.score ?? 0} / {a.total_points} ({percent}%)</p></div>
          <div><p className="text-xs uppercase text-slate-500">Started</p><p className="mt-1 text-sm">{new Date(a.started_at).toLocaleString()}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Submitted</p><p className="mt-1 text-sm">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "Not yet"}{a.automatic_submission ? " (auto, time ran out)" : ""}</p></div>
        </div>
        {needsGrading > 0 && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{needsGrading} theory answer{needsGrading === 1 ? " needs" : "s need"} grading. The score above counts them as 0 until graded.</p>}
        {a.tests?.passing_score != null && a.total_points > 0 && needsGrading === 0 && a.status !== "IN_PROGRESS" && (
          <p className="mt-4 text-sm text-slate-600">Passing score {a.tests.passing_score}% — {percent >= a.tests.passing_score ? <span className="font-semibold text-emerald-700">Passed</span> : <span className="font-semibold text-red-700">Not passed</span>}</p>
        )}
      </Card>

      <Card className="p-6" id="recording">
        <h2 className="font-semibold">Recordings — {student}</h2>
        <p className="mt-1 text-sm text-slate-500">{a.tests?.title} · started {new Date(a.started_at).toLocaleString()}</p>
        {objects.error ? (
          <p className="mt-4 text-sm text-red-700">Recordings could not be listed: {objects.error.message}. Make sure migrations 0004 and 0005 have been run in Supabase.</p>
        ) : groups.length ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {groups.map((group) => (
              <div key={group.key} className="rounded-lg border border-slate-200 p-4">
                <p className="mb-3 text-xs text-slate-500">{group.urls.length} parts · {group.mb.toFixed(1)} MB</p>
                <RecordingPlayer
                  label={`${groupLabel(group.kind)}${group.parts > 1 ? ` (session ${group.part} of ${group.parts})` : ""} — ${student}`}
                  urls={group.urls}
                  fileName={`${student}-${a.tests?.title}-${group.kind}${group.parts > 1 ? `-${group.part}` : ""}.webm`.replace(/[^\w.-]+/g, "_")}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No recording files were uploaded for this attempt.</p>
        )}
        <p className="mt-4 text-xs text-slate-500">Videos are downloaded directly from private storage using links that expire after one hour — reload the page for fresh links.</p>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold">Answers ({answers.size} of {questions.length} answered)</h2>
        <div className="space-y-4">
          {questions.map((q, index) => {
            const answer = answers.get(q.id);
            const selected = q.question_options.find((o) => o.id === answer?.selected_option_id);
            const correct = q.question_options.find((o) => o.id === q.correct_option_id);
            const isCorrect = q.type === "MCQ" && answer && answer.selected_option_id === q.correct_option_id;
            return (
              <Card key={q.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-500">Question {index + 1} · {q.type === "MCQ" ? "Multiple choice" : "Theory"} · {q.points} pt{q.points === 1 ? "" : "s"}</p>
                  {!answer ? <Badge tone="slate">Not answered</Badge>
                    : q.type === "MCQ" ? <Badge tone={isCorrect ? "green" : "red"}>{isCorrect ? "Correct" : "Incorrect"} · {answer.awarded_points ?? 0} pts</Badge>
                    : answer.awarded_points === null ? <Badge tone="amber">Needs grading</Badge>
                    : <Badge tone="green">Graded · {answer.awarded_points} pts</Badge>}
                </div>
                <p className="mt-3 whitespace-pre-wrap font-medium">{q.prompt}</p>

                {q.type === "MCQ" && (
                  <ul className="mt-4 space-y-2 text-sm">
                    {q.question_options.map((option, i) => {
                      const chosen = option.id === answer?.selected_option_id;
                      const right = option.id === q.correct_option_id;
                      return (
                        <li key={option.id} className={`rounded-lg border px-3 py-2 ${chosen && right ? "border-emerald-300 bg-emerald-50" : chosen ? "border-red-300 bg-red-50" : right ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}>
                          <b className="mr-2">{String.fromCharCode(65 + i)}.</b>{option.label}
                          {chosen && <span className="ml-2 text-xs font-semibold">— student's answer</span>}
                          {right && <span className="ml-2 text-xs font-semibold text-emerald-700">— correct answer</span>}
                        </li>
                      );
                    })}
                    {answer && !selected && <li className="text-slate-500">The selected option no longer exists.</li>}
                    {!correct && <li className="text-slate-500">No correct answer was set for this question.</li>}
                  </ul>
                )}

                {q.type === "THEORY" && (
                  <>
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                      <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Student's answer</p>
                      {answer ? <p className="whitespace-pre-wrap">{answer.answer_text || <span className="text-slate-500">(blank)</span>}</p> : <p className="text-slate-500">The student did not answer this question.</p>}
                    </div>
                    {answer && a.status !== "IN_PROGRESS" && (
                      <GradeForm attemptId={attemptId} questionId={q.id} maxPoints={Number(q.points)} initialPoints={answer.awarded_points === null ? null : Number(answer.awarded_points)} initialComment={reviews.get(q.id) ?? ""} />
                    )}
                  </>
                )}
              </Card>
            );
          })}
          {!questions.length && <Card className="p-8 text-center text-slate-500">No questions found for this test.</Card>}
        </div>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">Activity during this attempt</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {(activityRows ?? []).map((row: any) => (
            <div key={row.id} className="flex items-center justify-between py-2 text-sm">
              <span>{row.event_type}</span>
              <time className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</time>
            </div>
          ))}
          {!activityRows?.length && <p className="py-4 text-sm text-slate-500">No activity was logged for this attempt.</p>}
        </div>
      </Card>
    </div>
  );
}
