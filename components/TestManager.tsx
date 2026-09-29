"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { DraftQuestion, QuestionCard, blankQuestion } from "@/components/QuestionEditor";

type Test = { id: string; title: string; duration_minutes: number; status: string; passing_score: number };

export function TestManager({ initialTests }: { initialTests: Test[] }) {
  const [tests, setTests] = useState(initialTests);
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState(60);
  const [passing, setPassing] = useState(50);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, questionIndex) => (questionIndex === index ? { ...question, ...patch } : question)));
  }

  async function createTest(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (questions.some((question) => !question.prompt.trim() || (question.type === "MCQ" && question.options.filter(Boolean).length < 2))) {
      setMessage("Each question needs a prompt. MCQs need at least two options.");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/admin/tests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title, description, instructions, durationMinutes: duration, passingScore: passing, resultVisibility: "AFTER_REVIEW", publishNow,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        questions: questions.map((question) => ({ ...question, points: Number(question.points), options: question.options.filter(Boolean) })),
      }),
    });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(json.error ?? "Test could not be created."); return; }
    setTests((current) => [{ id: json.test.id, title: json.test.title, duration_minutes: duration, status: json.test.status, passing_score: passing }, ...current]);
    setMessage("Test created successfully.");
    setTitle(""); setDescription(""); setInstructions(""); setDuration(60); setPassing(50); setStartsAt(""); setEndsAt(""); setPublishNow(false); setQuestions([blankQuestion()]); setOpen(false);
  }

  async function changeStatus(test: Test, status: "READY" | "PUBLISHED" | "CLOSED") {
    if (status === "CLOSED" && !confirm(`Close "${test.title}"? Every student it's assigned to will immediately see it as unavailable and won't be able to start or continue it. You can reopen it later if needed.`)) return;
    const response = await fetch("/api/admin/tests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ testId: test.id, status }) });
    if (!response.ok) { const json = await response.json(); setMessage(json.error ?? "Test status could not be changed."); return; }
    setTests((current) => current.map((item) => (item.id === test.id ? { ...item, status } : item)));
  }

  async function deleteTest(test: Test) {
    if (!confirm(`Delete "${test.title}"? This also removes it from every student it was assigned to. This cannot be undone.`)) return;
    setDeletingId(test.id);
    setMessage("");
    const response = await fetch("/api/admin/tests", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ testId: test.id }) });
    const json = await response.json().catch(() => ({}));
    setDeletingId(null);
    if (!response.ok) { setMessage(json.error ?? "Test could not be deleted."); return; }
    setTests((current) => current.filter((item) => item.id !== test.id));
    setMessage("Test deleted.");
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tests</h1>
          <p className="mt-1 text-sm text-slate-500">Create, review, publish, and close assessments.</p>
        </div>
        <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={17} /> {open ? "Hide form" : "New test"}
        </button>
      </div>
      {message && <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      {open && (
        <Card className="mb-6 p-6">
          <h2 className="font-semibold">Create a test</h2>
          <form onSubmit={createTest} className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
              <label className="text-sm font-semibold">Duration in minutes<input value={duration} onChange={(e) => setDuration(Number(e.target.value))} type="number" min={1} max={600} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
              <label className="text-sm font-semibold">Passing score (%)<input value={passing} onChange={(e) => setPassing(Number(e.target.value))} type="number" min={0} max={100} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
              <label className="flex items-center gap-3 pt-7 text-sm font-semibold"><input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} /> Publish immediately after review</label>
              <label className="text-sm font-semibold">Opens at (optional)<input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} type="datetime-local" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-slate-500">Leave blank to make it available as soon as it's published.</span></label>
              <label className="text-sm font-semibold">Closes at (optional)<input value={endsAt} onChange={(e) => setEndsAt(e.target.value)} type="datetime-local" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-slate-500">Students can no longer start or continue after this time.</span></label>
            </div>
            <label className="block text-sm font-semibold">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-semibold">Instructions<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div><p className="font-semibold text-slate-900">Save this test</p><p className="text-sm text-slate-600">Add at least one question, then create the assessment.</p></div>
              <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{busy ? "Creating…" : "Create test"}</button>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Questions</h3>
                <button type="button" onClick={() => setQuestions((current) => [...current, blankQuestion()])} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">+ Add question</button>
              </div>
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <QuestionCard
                    key={index}
                    question={question}
                    index={index}
                    removable={questions.length > 1}
                    onChange={(patch) => updateQuestion(index, patch)}
                    onRemove={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  />
                ))}
              </div>
            </div>
            <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creating…" : "Create test"}</button>
          </form>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Title</th><th className="px-5 py-3">Duration</th><th className="px-5 py-3">Passing score</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {tests.map((test) => (
                <tr key={test.id}>
                  <td className="px-5 py-4 font-medium">{test.title}</td>
                  <td className="px-5 py-4">{test.duration_minutes} min</td>
                  <td className="px-5 py-4">{test.passing_score}%</td>
                  <td className="px-5 py-4"><Badge tone={test.status === "PUBLISHED" ? "green" : test.status === "CLOSED" ? "red" : "amber"}>{test.status}</Badge></td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {test.status !== "PUBLISHED" && test.status !== "CLOSED" && <button onClick={() => changeStatus(test, "PUBLISHED")} className="text-sm font-semibold text-blue-700">Publish</button>}
                      {test.status === "PUBLISHED" && <button onClick={() => changeStatus(test, "CLOSED")} className="text-sm font-semibold text-red-700">Close</button>}
                      {test.status === "CLOSED" && <button onClick={() => changeStatus(test, "PUBLISHED")} className="text-sm font-semibold text-blue-700">Reopen</button>}
                      <button onClick={() => deleteTest(test)} disabled={deletingId === test.id} className="text-sm font-semibold text-red-700 disabled:opacity-50">{deletingId === test.id ? "Deleting…" : "Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!tests.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No tests yet. Create the first test above.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
