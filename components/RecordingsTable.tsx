"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type RecordingRow = {
  attemptId: string;
  student: string;
  test: string;
  started: string;
  status: string;
  files: number;
  bytes: number;
};

const fmt = (bytes: number) => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

// The admin decides what to delete. Nothing is removed automatically, and answers/scores are never touched.
export function RecordingsTable({ rows }: { rows: RecordingRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedBytes = rows.filter((r) => selected.has(r.attemptId)).reduce((sum, r) => sum + r.bytes, 0);

  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  async function remove(ids: string[]) {
    if (!ids.length) return;
    if (!window.confirm(`Permanently delete the video files of ${ids.length} attempt(s)? Answers and scores are kept. This cannot be undone.`)) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/admin/recordings", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptIds: ids }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMessage(json.error ?? "Recordings could not be deleted."); return; }
    setSelected(new Set());
    setMessage(`Deleted ${json.removedFiles} file(s).`);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm">
        <span className="text-slate-600">{selected.size ? `${selected.size} selected · ${fmt(selectedBytes)}` : "Tick the recordings you want to delete to free space."}</span>
        <button disabled={!selected.size || busy} onClick={() => remove([...selected])} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Deleting…" : "Delete selected"}</button>
      </div>
      {message && <p className="border-b border-slate-100 px-5 py-2 text-sm text-slate-600">{message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-5 py-3 w-10"><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && selected.size === rows.length} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.attemptId)) : new Set())} /></th><th className="px-5 py-3">Student</th><th className="px-5 py-3">Test</th><th className="px-5 py-3">Started</th><th className="px-5 py-3">Files</th><th className="px-5 py-3">Size</th><th className="px-5 py-3">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.attemptId}>
                <td className="px-5 py-4"><input type="checkbox" aria-label="Select recording" checked={selected.has(r.attemptId)} onChange={() => toggle(r.attemptId)} /></td>
                <td className="px-5 py-4">{r.student}</td>
                <td className="px-5 py-4">{r.test}</td>
                <td className="px-5 py-4">{r.started}</td>
                <td className="px-5 py-4">{r.files}</td>
                <td className="px-5 py-4">{fmt(r.bytes)}</td>
                <td className="px-5 py-4"><div className="flex gap-4"><Link href={`/admin/attempts/${r.attemptId}#recording` as any} className="font-semibold text-blue-700">Watch</Link><button disabled={busy} onClick={() => remove([r.attemptId])} className="font-semibold text-red-700 disabled:opacity-40">Delete</button></div></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No recordings stored.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
