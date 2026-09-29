"use client";

import { FormEvent, useState } from "react";
import { Badge, Card } from "@/components/ui";

type Student = { id: string; full_name: string | null; email: string };
type Test = { id: string; title: string };
type AssignmentRow = {
  id: string;
  status: string;
  assigned_at: string;
  due_at: string | null;
  profiles: { full_name: string | null; email: string };
  tests: { id: string; title: string; status: string; starts_at: string | null; ends_at: string | null };
};

function testProblem(test: AssignmentRow["tests"]) {
  if (test.status !== "PUBLISHED") return `${test.status === "CLOSED" ? "Closed" : "Draft — never published"}. The student cannot see this test until it's published.`;
  const now = Date.now();
  if (test.starts_at && now < new Date(test.starts_at).getTime()) return `Opens ${new Date(test.starts_at).toLocaleString()}.`;
  if (test.ends_at && now > new Date(test.ends_at).getTime()) return `Closed ${new Date(test.ends_at).toLocaleString()}.`;
  return null;
}

export function AssignmentManager({ students, tests, initialRows }: { students: Student[]; tests: Test[]; initialRows: AssignmentRow[] }) {
  const [selectedTest, setSelectedTest] = useState(tests[0]?.id ?? "");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState(initialRows);
  const [fixingId, setFixingId] = useState<string | null>(null);

  function toggleStudent(id: string) {
    setSelectedStudents((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ testId: selectedTest, studentIds: selectedStudents, dueAt: dueAt ? new Date(dueAt).toISOString() : null }),
    });
    const json = await response.json();
    setBusy(false);
    setMessage(response.ok ? `${json.count} assignment(s) saved successfully.` : (json.error ?? "Assignments could not be saved."));
    if (response.ok) setSelectedStudents([]);
  }

  async function publishNow(row: AssignmentRow) {
    setFixingId(row.id);
    const response = await fetch("/api/admin/tests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ testId: row.tests.id, status: "PUBLISHED" }) });
    setFixingId(null);
    if (!response.ok) { setMessage("Could not publish the test."); return; }
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, tests: { ...item.tests, status: "PUBLISHED" } } : item)));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">Assign published tests to one or more active students.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">Create assignments</h2>
        <form onSubmit={submit} className="mt-5 space-y-5">
          <label className="block text-sm font-semibold">
            Published test
            <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required>
              <option value="">Select a test</option>
              {tests.map((test) => <option key={test.id} value={test.id}>{test.title}</option>)}
            </select>
          </label>
          <div>
            <p className="text-sm font-semibold">Students</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {students.map((student) => (
                <label key={student.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                  <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                  <span>{student.full_name ?? student.email}<span className="block text-xs text-slate-500">{student.email}</span></span>
                </label>
              ))}
            </div>
          </div>
          <label className="block text-sm font-semibold">Optional due date/time<input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="mt-2 rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          {message && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
          <button disabled={busy || !selectedTest || !selectedStudents.length} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Assign test"}</button>
        </form>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Test</th><th className="px-5 py-3">Assigned</th><th className="px-5 py-3">Assignment status</th><th className="px-5 py-3">Visible to student?</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const problem = testProblem(row.tests);
                return (
                  <tr key={row.id}>
                    <td className="px-5 py-4">{row.profiles?.full_name ?? row.profiles?.email}</td>
                    <td className="px-5 py-4">{row.tests?.title}</td>
                    <td className="px-5 py-4">{new Date(row.assigned_at).toLocaleString()}</td>
                    <td className="px-5 py-4"><Badge tone={row.status === "COMPLETED" ? "green" : row.status === "IN_PROGRESS" ? "amber" : "blue"}>{row.status}</Badge></td>
                    <td className="px-5 py-4">
                      {problem ? (
                        <div className="flex items-center gap-3">
                          <span className="text-red-700">{problem}</span>
                          {row.tests.status !== "PUBLISHED" && (
                            <button onClick={() => publishNow(row)} disabled={fixingId === row.id} className="whitespace-nowrap rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                              {fixingId === row.id ? "Publishing…" : "Publish now"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-700">Yes</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No assignments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
