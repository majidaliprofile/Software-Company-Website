"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function GradeForm({ attemptId, questionId, maxPoints, initialPoints, initialComment }: {
  attemptId: string;
  questionId: string;
  maxPoints: number;
  initialPoints: number | null;
  initialComment: string;
}) {
  const router = useRouter();
  const [points, setPoints] = useState(initialPoints === null ? "" : String(initialPoints));
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const value = Number(points);
    if (points.trim() === "" || Number.isNaN(value) || value < 0 || value > maxPoints) {
      setMessage({ ok: false, text: `Enter points between 0 and ${maxPoints}.` });
      return;
    }
    setBusy(true);
    const response = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId, questionId, points: value, comment }),
    });
    const json = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage({ ok: false, text: json.error ?? "Grade could not be saved." }); return; }
    setMessage({ ok: true, text: "Grade saved." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold">
          Points (max {maxPoints})
          <input value={points} onChange={(e) => setPoints(e.target.value)} type="number" min={0} max={maxPoints} step={0.5} className="mt-1 block w-28 rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="min-w-[200px] flex-1 text-sm font-semibold">
          Comment (optional)
          <input value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Saving…" : "Save grade"}</button>
      </div>
      {message && <p className={`mt-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>}
    </form>
  );
}
