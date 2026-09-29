import { createClient } from "@/lib/supabase/client";

export type RecordingKind = "camera" | "screen";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Uploads recording pieces straight from the student's browser to Supabase Storage.
 * The video never passes through the Next.js/Vercel server, so Vercel's request size limit
 * and function time limits do not apply.
 *
 * File names are deterministic within a recording (`camera-<segment>-000001.webm`) so a retry can never create a duplicate piece,
 * and the admin viewer can always put the pieces back in recording order.
 */
export function createChunkUploader({ userId, attemptId, kind, onProblem }: {
  userId: string;
  attemptId: string;
  kind: RecordingKind;
  onProblem: (hasProblem: boolean) => void;
}) {
  const supabase = createClient();
  const now = new Date();
  // Fixed once, so a retry after midnight still targets the same file.
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}/${userId}/${attemptId}`;
  // Each start of the recorder gets its own segment id, so restarting after a page reload can never collide
  // with (or be silently skipped because of) pieces uploaded earlier for the same attempt.
  const segment = Date.now().toString(36);
  let nextIndex = 0;
  let queue: Promise<void> = Promise.resolve();
  const failed: { index: number; blob: Blob }[] = [];

  const pathFor = (index: number) => `${folder}/${kind}-${segment}-${String(index).padStart(6, "0")}.webm`;

  async function uploadWithRetry(index: number, blob: Blob) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { error } = await supabase.storage.from("recordings").upload(pathFor(index), blob, { contentType: "video/webm", upsert: false });
      if (!error) return true;
      const info = error as unknown as { statusCode?: string | number; status?: number; message?: string };
      // "Already exists" means an earlier try actually arrived — that piece is safely stored.
      if (String(info.statusCode ?? info.status) === "409" || /already exists/i.test(info.message ?? "")) return true;
      await sleep(1000 * 2 ** attempt);
    }
    return false;
  }

  async function retryFailed() {
    for (const item of [...failed]) {
      if (await uploadWithRetry(item.index, item.blob)) failed.splice(failed.indexOf(item), 1);
    }
  }

  return {
    /** Queue one recorded piece. Pieces upload one at a time, in order. */
    push(blob: Blob) {
      if (!blob.size) return;
      const index = ++nextIndex;
      queue = queue.then(async () => {
        if (failed.length) await retryFailed();
        if (!(await uploadWithRetry(index, blob))) failed.push({ index, blob });
        onProblem(failed.length > 0);
      });
    },
    /** Wait for everything queued to finish uploading, retrying anything that failed. */
    async flush() {
      await queue;
      if (failed.length) await retryFailed();
      onProblem(failed.length > 0);
    },
    count: () => nextIndex,
    pending: () => failed.length,
  };
}
