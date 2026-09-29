"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CircleCheck, Video } from "lucide-react";
import { createChunkUploader, type RecordingKind } from "@/lib/recording-uploader";

type Q = {
  id: string;
  order_index: number;
  type: "MCQ" | "THEORY";
  prompt: string;
  points: number;
  question_options: { id: string; label: string }[];
};

async function logEvent(attemptId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  try {
    await fetch("/api/attempts/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId, eventType, metadata }),
      keepalive: true,
    });
  } catch { /* logging must never break the test */ }
}

// Retries a request a few times so one dropped connection can't leave the attempt "In progress".
async function postWithRetry(url: string, body: unknown, tries = 4) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true });
      if (res.ok) return true;
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) return false;
    } catch { /* retry */ }
    await new Promise((resolve) => window.setTimeout(resolve, 800 * 2 ** i));
  }
  return false;
}

export function AssessmentClient({
  assignmentId,
  userId,
  title,
  durationMinutes,
  questions,
}: {
  assignmentId: string;
  userId: string;
  title: string;
  durationMinutes: number;
  questions: Q[];
}) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingWarning, setRecordingWarning] = useState("");
  const attemptRef = useRef<string | null>(null);
  const recorders = useRef<MediaRecorder[]>([]);
  const uploaders = useRef<{ kind: RecordingKind; uploader: ReturnType<typeof createChunkUploader> }[]>([]);
  const streams = useRef<MediaStream[]>([]);
  const current = questions[index];
  const [seconds, setSeconds] = useState(durationMinutes * 60);

  const stopEverything = () => {
    recorders.current.forEach((item) => { if (item.state !== "inactive") { try { item.stop(); } catch { /* already stopped */ } } });
    streams.current.flatMap((stream) => stream.getTracks()).forEach((track) => track.stop());
  };
  useEffect(() => () => stopEverything(), []);

  // Must run from a button click: browsers only allow the screen-share picker right after a user gesture.
  async function begin() {
    setBusy(true);
    setError("");
    let camera: MediaStream | null = null;
    let screen: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
        throw new Error("This browser does not support the required recording APIs. Please use Chrome or Edge on a laptop/desktop.");
      }
      // Screen first (needs the fresh click), then camera + microphone.
      screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      screen?.getTracks().forEach((t) => t.stop());
      camera?.getTracks().forEach((t) => t.stop());
      setError(e instanceof Error && e.message.includes("support") ? e.message : "Camera, microphone and screen sharing must all be allowed to start. Click the button again and allow all three (choose \"Entire screen\").");
      setBusy(false);
      return;
    }
    streams.current = [camera, screen];

    // Only now does the attempt (and its timer) start.
    const res = await fetch("/api/attempts/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assignmentId }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      stopEverything();
      setError(json.error ?? "This assessment could not be started.");
      setBusy(false);
      return;
    }
    const startedAttemptId = json.attempt.id as string;
    attemptRef.current = startedAttemptId;
    setAttemptId(startedAttemptId);
    setExpiresAt(json.attempt.expires_at);
    setSeconds(Math.max(0, Math.floor((new Date(json.attempt.expires_at).getTime() - Date.now()) / 1000)));
    setStarted(true);
    setBusy(false);

    try {
      const pickMime = (withAudio: boolean) =>
        (withAudio
          ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
          : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
        ).find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";

      // Two separate recordings: the camera with microphone, and the screen. Each is a normal single-source WebM.
      const specs: { kind: RecordingKind; stream: MediaStream; options: MediaRecorderOptions }[] = [
        { kind: "camera", stream: camera, options: { mimeType: pickMime(true), videoBitsPerSecond: 600_000, audioBitsPerSecond: 64_000 } },
        { kind: "screen", stream: new MediaStream(screen.getVideoTracks()), options: { mimeType: pickMime(false), videoBitsPerSecond: 1_500_000 } },
      ];

      const problems: Record<string, boolean> = {};
      const updateProblem = (kind: RecordingKind, hasProblem: boolean) => {
        problems[kind] = hasProblem;
        setRecordingWarning(Object.values(problems).some(Boolean) ? "A recording piece could not be uploaded yet. Keep the assessment open while the connection recovers." : "");
      };

      // If a stream stops we warn and log it, but never block the student from submitting:
      // a stuck "In progress" attempt is worse than a recording gap the admin can see in the log.
      const onTrackEnded = (label: string) => {
        setRecording(false);
        setRecordingWarning("Camera, microphone, or screen sharing stopped. You can still submit your answers, but please tell your invigilator.");
        void logEvent(startedAttemptId, "RECORDING_STREAM_STOPPED", { stream: label });
      };
      camera.getTracks().forEach((track) => track.addEventListener("ended", () => onTrackEnded(`camera-${track.kind}`)));
      screen.getTracks().forEach((track) => track.addEventListener("ended", () => onTrackEnded("screen")));
      const surface = (screen.getVideoTracks()[0]?.getSettings() as { displaySurface?: string } | undefined)?.displaySurface;
      void logEvent(startedAttemptId, "RECORDING_STARTED", { screenSurface: surface ?? "unknown" });

      // Tiny JSON calls only — the video itself is uploaded directly to storage by the browser.
      await Promise.all(specs.map((spec) => fetch("/api/recordings/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId: startedAttemptId, kind: spec.kind.toUpperCase() }),
      }).catch(() => null)));

      recorders.current = [];
      uploaders.current = [];
      for (const spec of specs) {
        const uploader = createChunkUploader({ userId, attemptId: startedAttemptId, kind: spec.kind, onProblem: (has) => updateProblem(spec.kind, has) });
        const mediaRecorder = new MediaRecorder(spec.stream, spec.options);
        mediaRecorder.ondataavailable = (event) => uploader.push(event.data);
        mediaRecorder.onerror = () => {
          setRecording(false);
          setRecordingWarning("A recording failed. You can still submit your answers.");
        };
        mediaRecorder.start(5000);
        recorders.current.push(mediaRecorder);
        uploaders.current.push({ kind: spec.kind, uploader });
      }
      setRecording(true);
    } catch {
      setRecordingWarning("Recording could not be fully started. You can still submit your answers.");
    }
  }

  useEffect(() => {
    if (!expiresAt || done) return;
    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSeconds(next);
      if (next === 0) {
        window.clearInterval(interval);
        void finalize(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, done]);

  async function finalize(automatic = false) {
    const activeAttempt = attemptRef.current;
    if (done || !activeAttempt) return;
    setDone(true);
    // Stop both recorders (the last piece is emitted on stop) and release camera + screen.
    await Promise.all(recorders.current.map((item) => item.state === "inactive"
      ? Promise.resolve()
      : new Promise<void>((resolve) => { item.addEventListener("stop", () => resolve(), { once: true }); try { item.stop(); } catch { resolve(); } })));
    streams.current.flatMap((stream) => stream.getTracks()).forEach((track) => track.stop());
    // Upload the last pieces of BOTH recordings (storage accepts uploads for 2 minutes after submitting).
    await Promise.race([
      Promise.all(uploaders.current.map((item) => item.uploader.flush().catch(() => undefined))),
      new Promise((resolve) => window.setTimeout(resolve, 30000)),
    ]);
    // Mark the attempt submitted FIRST and independently, so a recording problem can never leave it "In progress".
    await postWithRetry("/api/attempts/finalize", { attemptId: activeAttempt, automatic });
    const counts = Object.fromEntries(uploaders.current.map((item) => [item.kind.toUpperCase(), item.uploader.count()]));
    await postWithRetry("/api/recordings/finalize", { attemptId: activeAttempt, counts });
    router.replace(`/student?submitted=${automatic ? "automatic" : "true"}`);
  }

  async function submit() {
    if (!attemptId || !current) return;
    setError("");
    setBusy(true);
    const body = current.type === "MCQ" ? { selectedOptionId: answer } : { answerText: answer };
    const res = await fetch("/api/attempts/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId, questionId: current.id, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    // "locked" means this answer was already saved earlier (e.g. the page was reloaded) — carry on.
    const alreadySaved = !res.ok && /locked/i.test(json.error ?? "");
    if (!res.ok && !alreadySaved) {
      setError(json.error ?? "Answer could not be submitted.");
      setBusy(false);
      return;
    }
    if (index === questions.length - 1) await finalize(false);
    else {
      setIndex((value) => value + 1);
      setAnswer("");
      setBusy(false);
    }
  }

  if (!current) {
    return <div className="mx-auto max-w-2xl"><div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">No published questions are available for this test.</div></div>;
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">AS Code Assess</p>
          <h1 className="mt-1 text-xl font-bold">{title}</h1>
          <p className="mt-3 text-sm text-slate-600">{questions.length} question(s) · {durationMinutes} minutes. Your camera, microphone and entire screen are recorded during the test. The timer starts after you allow all three.</p>
          {error && <div className="mt-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={18} className="shrink-0" /><span>{error}</span></div>}
          <button disabled={busy} onClick={begin} className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Starting…" : "Allow recording & start test"}</button>
          <p className="mt-3 text-center text-xs text-slate-500">When asked, share your <b>Entire screen</b>, then allow camera and microphone.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div><p className="text-sm font-semibold text-slate-500">AS Code Assess</p><h1 className="text-xl font-bold">{title}</h1></div>
        <div className="text-right"><p className="text-xs text-slate-500">Time remaining</p><p className={`font-mono text-xl font-bold ${seconds < 60 ? "text-red-700" : "text-slate-900"}`}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p></div>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <span>Question {index + 1} of {questions.length}</span>
        <span className={`flex items-center gap-2 ${recording ? "text-emerald-700" : "text-amber-700"}`}><Video size={16} />{recording ? "Recording active" : "Recording needs attention"}</span>
      </div>
      {(recordingWarning || error) && <div className="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={18} className="shrink-0" /><span>{recordingWarning || error}</span></div>}
      <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-soft">
        <p className="text-lg font-semibold leading-relaxed">{current.prompt}</p>
        {current.type === "MCQ" ? <div className="mt-7 space-y-3">{current.question_options.map((option, optionIndex) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${answer === option.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><input type="radio" name="answer" checked={answer === option.id} onChange={() => setAnswer(option.id)} className="h-4 w-4" /><span className="text-sm"><b className="mr-2">{String.fromCharCode(65 + optionIndex)}.</b>{option.label}</span></label>)}</div> : <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={8} className="mt-7 w-full rounded-lg border border-slate-300 p-3" placeholder="Write your answer here…" />}
        <button disabled={busy || !answer.trim() || seconds <= 0} onClick={submit} className="mt-7 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : index === questions.length - 1 ? "Submit assessment" : "Submit & next"}</button>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><CircleCheck size={14} /> Submitted answers are locked and cannot be edited.</p>
      </div>
    </div>
  );
}