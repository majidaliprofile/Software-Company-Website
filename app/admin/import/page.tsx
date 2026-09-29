"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { DraftQuestion, QuestionCard, blankQuestion, draftFromParsed } from "@/components/QuestionEditor";

type ParsedQuestion = { number: number | null; prompt: string; type: "MCQ" | "THEORY"; options: string[]; points: number | null; confidence: number; needsReview: boolean };

export default function QuestionImport() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState("");

  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState(60);
  const [passing, setPassing] = useState(50);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);

  async function parse() {
    if (!file) return;
    setParsing(true);
    setParseMessage("");
    setCreateMessage("");
    setCreatedTestId(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/questions/import", { method: "POST", body: form });
    const json = await res.json();
    setParsing(false);
    if (!res.ok) { setParseMessage(json.error ?? "Could not parse the file."); return; }
    const parsed: ParsedQuestion[] = json.questions ?? [];
    if (!parsed.length) { setParseMessage("No questions were detected in this file. You can still add questions manually below."); }
    else setParseMessage(json.note ?? "Preview only. Review and edit the questions below, then create the test.");
    setQuestions(parsed.map(draftFromParsed));
    if (!title) setTitle(file.name.replace(/\.(pdf|docx|txt)$/i, ""));
  }

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, questionIndex) => (questionIndex === index ? { ...question, ...patch } : question)));
  }

  async function createTest(event: FormEvent) {
    event.preventDefault();
    setCreateMessage("");
    if (!questions.length) { setCreateMessage("Add at least one question before creating the test."); return; }
    if (questions.some((question) => !question.prompt.trim() || (question.type === "MCQ" && question.options.filter(Boolean).length < 2))) {
      setCreateMessage("Each question needs a prompt. MCQs need at least two options.");
      return;
    }
    setCreating(true);
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
    setCreating(false);
    if (!response.ok) { setCreateMessage(json.error ?? "Test could not be created."); return; }
    setCreatedTestId(json.test.id);
    setCreateMessage(`"${json.test.title}" was created successfully.`);
    setQuestions([]);
    setTitle(""); setDescription(""); setInstructions(""); setDuration(60); setPassing(50); setStartsAt(""); setEndsAt(""); setPublishNow(false);
    setFile(null); setParseMessage("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Import question paper</h1>
      <p className="mt-1 text-sm text-slate-500">Upload a PDF, DOCX, or TXT question paper, review and edit the detected questions, then create the test.</p>

      <Card className="mt-8 p-6">
        <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={parse} disabled={!file || parsing} className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {parsing ? "Parsing…" : "Upload and preview"}
        </button>
        {parseMessage && <p className="mt-4 text-sm text-slate-600">{parseMessage}</p>}
      </Card>

      {createMessage && (
        <p className="mt-6 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          {createMessage} {createdTestId && <Link href="/admin" className="font-semibold underline">View tests</Link>}
        </p>
      )}

      {questions.length > 0 && (
        <form onSubmit={createTest} className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold">Test details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
              <label className="text-sm font-semibold">Duration in minutes<input value={duration} onChange={(e) => setDuration(Number(e.target.value))} type="number" min={1} max={600} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
              <label className="text-sm font-semibold">Passing score (%)<input value={passing} onChange={(e) => setPassing(Number(e.target.value))} type="number" min={0} max={100} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
              <label className="flex items-center gap-3 pt-7 text-sm font-semibold"><input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} /> Publish immediately after review</label>
              <label className="text-sm font-semibold">Opens at (optional)<input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} type="datetime-local" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-slate-500">Leave blank to make it available as soon as it's published.</span></label>
              <label className="text-sm font-semibold">Closes at (optional)<input value={endsAt} onChange={(e) => setEndsAt(e.target.value)} type="datetime-local" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-slate-500">Students can no longer start or continue after this time.</span></label>
            </div>
            <label className="mt-4 block text-sm font-semibold">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="mt-4 block text-sm font-semibold">Instructions<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div><p className="font-semibold text-slate-900">Create this test</p><p className="text-sm text-slate-600">Review the {questions.length} detected question{questions.length === 1 ? "" : "s"} below before saving.</p></div>
            <button type="submit" disabled={creating} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{creating ? "Creating…" : "Create test"}</button>
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

          <button disabled={creating} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{creating ? "Creating…" : "Create test"}</button>
        </form>
      )}
    </div>
  );
}
