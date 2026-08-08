-- ============================================================
-- EventFull: primary photo pointer + Storage for real image files
-- Run in Supabase → SQL Editor (safe to re-run)
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS primary_photo_id BIGINT REFERENCES photos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_primary_photo
  ON events(primary_photo_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read photo files" ON storage.objects;
CREATE POLICY "Public read photo files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Users upload own photo files" ON storage.objects;
CREATE POLICY "Users upload own photo files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own photo files" ON storage.objects;
CREATE POLICY "Users update own photo files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own photo files" ON storage.objects;
CREATE POLICY "Users delete own photo files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
