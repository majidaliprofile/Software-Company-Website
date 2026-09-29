"use client";

import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { Badge, Card } from "@/components/ui";

type Student = { id: string; full_name: string | null; email: string; is_active: boolean; created_at: string };

export function StudentManager({ initialStudents }: { initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [open, setOpen] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createStudent(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const response = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(json.error ?? "Student could not be created.");
      return;
    }
    setStudents((current) => [
      {
        id: json.student.id,
        full_name: json.student.fullName,
        email: json.student.email,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
    setFullName("");
    setEmail("");
    setPassword("");
    setMessage("Student account created successfully.");
    setOpen(false);
  }

  async function toggle(student: Student) {
    const response = await fetch("/api/admin/students", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId: student.id, isActive: !student.is_active }),
    });
    if (!response.ok) {
      const json = await response.json();
      setMessage(json.error ?? "Student status could not be changed.");
      return;
    }
    setStudents((current) => current.map((item) => item.id === student.id ? { ...item, is_active: !item.is_active } : item));
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="mt-1 text-sm text-slate-500">Create accounts, control access, and review student records.</p>
        </div>
        <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <UserPlus size={17} /> {open ? "Hide form" : "Add student"}
        </button>
      </div>
      {message && <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      {open && (
        <Card className="mb-6 p-6">
          <h2 className="font-semibold">Create student account</h2>
          <p className="mt-1 text-sm text-slate-500">The password is sent or shared by the administrator through a secure method. It is never shown in this table.</p>
          <form onSubmit={createStudent} className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold">Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
            <label className="text-sm font-semibold">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
            <label className="text-sm font-semibold">Temporary password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={12} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required /></label>
            <div className="col-span-full flex justify-start border-t border-slate-100 pt-4"><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{busy ? "Creating…" : "Create student account"}</button></div>
          </form>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => <tr key={student.id}><td className="px-5 py-4 font-medium">{student.full_name ?? "Unnamed student"}</td><td className="px-5 py-4 text-slate-600">{student.email}</td><td className="px-5 py-4"><Badge tone={student.is_active ? "green" : "red"}>{student.is_active ? "Active" : "Disabled"}</Badge></td><td className="px-5 py-4"><button onClick={() => toggle(student)} className="text-sm font-semibold text-blue-700">{student.is_active ? "Disable" : "Enable"}</button></td></tr>)}
              {!students.length && <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">No students yet. Add the first student account above.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}