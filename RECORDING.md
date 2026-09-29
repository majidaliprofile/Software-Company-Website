# Recording implementation and retention

## Browser requirements

Recording starts only after the assessment has started. The preflight checks camera, microphone, screen sharing, browser support, HTTPS, and recording initialization. In local development, `localhost` is treated as secure by browsers; production must use HTTPS.

## Chunk flow

1. The browser obtains camera/microphone and display streams.
2. A `MediaRecorder` emits WebM chunks every five seconds.
3. Chunks are sent to `/api/recordings/chunk` with the authenticated session.
4. The route verifies the user, finds or creates a recording session, writes the private storage object, and records metadata in `recording_chunks`.
5. The storage path includes UTC year/month/day, student UUID, attempt UUID, and chunk identifier.

This avoids sending one large file through a Vercel server function. For very high volume, use a dedicated resumable upload service or direct signed upload URLs with a secure server-issued token.

## Failure behavior

The assessment displays a recording initialization error and must not silently proceed. During production hardening, attach `MediaRecorder.onerror`, stream `ended` handlers, upload retry/backoff, offline queueing, and an explicit configured policy for pause/resume. Every failure and recovery should be written to `activity_logs`.

## Private access

Keep `recordings` private. An admin recording viewer should verify `public.is_admin()`, create a short-lived signed URL, and never expose storage paths or service keys to students.

## Retention

Store a setting such as `{ "mode": "30_DAYS" }`, `{ "mode": "90_DAYS" }`, or `{ "mode": "INDEFINITE" }` in `settings`. Implement a scheduled cleanup job only after legal/academic retention requirements are agreed. Never delete recordings for active or disputed assessments. Prefer archival before deletion when required.

## Update (migration 0006)

- Recording starts from a button click on the take page (screen share first, then camera/mic), then the attempt starts.
- Files: `camera-<segment>-000001.webm` and `screen-<segment>-000001.webm`; a reload creates a new segment, never overwriting old pieces.
- Submitting never depends on recording: the attempt is finalized first (with retries), recordings second.
- Attempts past their time limit are auto-closed by `finalize_expired_attempts()` when an admin opens Attempts/Recordings.
- Admin > Recordings lists every recording of every student (old and new) with size; only the admin's explicit Delete removes files. Answers and scores are always kept.
