"use client";

import { useEffect, useState } from "react";

// A recording is stored as many ~5 second pieces of one continuous WebM stream. Only the first piece
// carries the file header, so the pieces are downloaded (a few at a time), joined in order, and played.
export function RecordingPlayer({ label, urls, fileName }: { label: string; urls: string[]; fileName: string }) {
  const [done, setDone] = useState(0);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  async function load() {
    setLoading(true);
    setError("");
    setDone(0);
    try {
      const parts: Blob[] = new Array(urls.length);
      let next = 0;
      let finished = 0;
      const worker = async () => {
        while (next < urls.length) {
          const i = next++;
          let blob: Blob | null = null;
          for (let attempt = 0; attempt < 3 && !blob; attempt += 1) {
            try {
              const response = await fetch(urls[i]);
              if (response.ok) blob = await response.blob();
            } catch { /* retry */ }
          }
          if (!blob) throw new Error(`Part ${i + 1} of ${urls.length} could not be downloaded.`);
          parts[i] = blob;
          finished += 1;
          setDone(finished);
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      setVideoUrl(URL.createObjectURL(new Blob(parts, { type: "video/webm" })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The recording could not be loaded.");
    }
    setLoading(false);
  }

  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{label}</p>
      {videoUrl ? (
        <>
          <video src={videoUrl} controls className="w-full rounded-lg bg-black" />
          <a href={videoUrl} download={fileName} className="mt-3 inline-block text-sm font-semibold text-blue-700">Download (.webm)</a>
        </>
      ) : (
        <>
          <button onClick={load} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? `Loading… ${done} of ${urls.length}` : `Watch (${urls.length} parts)`}
          </button>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        </>
      )}
    </div>
  );
}
