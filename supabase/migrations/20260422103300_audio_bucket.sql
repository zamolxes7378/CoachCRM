-- =============================================================================
-- 20260422103300_audio_bucket.sql
-- Supabase Storage bucket "audio_recordings" for session audio files.
--
-- DESIGN:
--   - Private bucket (no public read)
--   - Path convention: {user_id}/{client_id}/{session_id}/{filename}
--   - INSERT: authenticated owner only (path must start with their user_id)
--   - SELECT: owner via signed URLs only (not direct public URLs)
--   - DELETE: owner or admin
--   - 30-day purge: documented below — requires a scheduled Edge Function
--     because Supabase Storage objects cannot be hard-deleted from SQL
--     (storage.objects is managed by the storage engine, not directly by pg).
--
-- ROLLBACK:
--   -- From Supabase Dashboard: Storage → audio_recordings → Delete bucket
--   -- OR via SQL (if bucket is empty):
--   DELETE FROM storage.buckets WHERE id = 'audio_recordings';
--   DROP POLICY IF EXISTS "audio_upload_owner" ON storage.objects;
--   DROP POLICY IF EXISTS "audio_read_owner" ON storage.objects;
--   DROP POLICY IF EXISTS "audio_delete_owner_or_admin" ON storage.objects;
--
-- Idempotent: INSERT ON CONFLICT DO NOTHING for bucket; DROP POLICY IF EXISTS.
--
-- Findings closed: G-03 (audio data at rest), R-12 (audio consent + lifecycle)
-- Track: P1-Z
-- =============================================================================

-- =============================================================================
-- Create bucket (idempotent)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio_recordings',
  'audio_recordings',
  false,                              -- private: no public URL access
  104857600,                          -- 100 MB per file limit
  ARRAY[
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/x-m4a'
  ]
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE storage.buckets IS
  'audio_recordings: private bucket for session audio. '
  'Path: {user_id}/{client_id}/{session_id}/{filename}. '
  'Max 100 MB. 30-day purge via scheduled Edge Function (see below).';

-- =============================================================================
-- RLS on storage.objects for audio_recordings bucket
-- =============================================================================

-- INSERT: authenticated user can upload only under their own user_id prefix
DROP POLICY IF EXISTS "audio_upload_owner" ON storage.objects;
CREATE POLICY "audio_upload_owner"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio_recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: owner can read (for generating signed URLs via API; direct select is not public)
DROP POLICY IF EXISTS "audio_read_owner" ON storage.objects;
CREATE POLICY "audio_read_owner"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio_recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: owner or admin
DROP POLICY IF EXISTS "audio_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "audio_delete_owner_or_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio_recordings'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
    )
  );

-- UPDATE: prohibited — no policy

-- =============================================================================
-- 30-day purge — Edge Function requirement
--
-- Supabase Storage objects cannot be purged directly from SQL because:
--   1. storage.objects rows are managed by the Supabase storage engine.
--   2. Hard-deleting the row leaves the backing file orphaned on S3.
--   3. The correct API is the Supabase Storage client `remove([paths])`.
--
-- REQUIRED ACTION (P2 backlog):
--   Create a Supabase Edge Function `purge-old-audio` that:
--     1. Lists all objects in `audio_recordings` older than 30 days via
--        supabase.storage.from('audio_recordings').list() with metadata.
--     2. Calls supabase.storage.from('audio_recordings').remove([paths])
--        for each expired object.
--     3. Logs deleted paths to audit_log with action='purge_audio'.
--   Schedule via Supabase Dashboard → Edge Functions → Schedule, or via cron.schedule:
--     cron.schedule('purge-old-audio-daily', '0 3 * * *',
--       'SELECT net.http_post(url:=''https://<project>.supabase.co/functions/v1/purge-old-audio'', ...)');
--
-- In the meantime, the pg_cron block below emits a NOTICE as a reminder.
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE
      'TODO P2: Schedule Edge Function "purge-old-audio" to delete storage objects '
      'older than 30 days from bucket "audio_recordings". '
      'SQL purge of storage.objects is unsafe — use the Supabase Storage API. '
      'See 20260422103300_audio_bucket.sql §30-day purge for details.';
  END IF;
END $$;

-- =============================================================================
-- Consent log: add audio_consent column to sessions (idempotent)
--
-- Tracks that the client explicitly granted consent before audio recording.
-- The audioService.js uploadAudio() function sets this flag.
-- =============================================================================
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS audio_consent_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS audio_consent_ip INET;

COMMENT ON COLUMN sessions.audio_consent_granted_at IS
  'Timestamp when the therapist confirmed client consent for audio recording. '
  'NULL means no recording or consent not yet recorded. '
  'Set by audioService.uploadAudio() — requires consentGranted=true.';

COMMENT ON COLUMN sessions.audio_consent_ip IS
  'IP address of the therapist at consent time (best-effort, from client headers).';
