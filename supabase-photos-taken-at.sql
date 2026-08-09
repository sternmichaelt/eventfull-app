-- Add camera "date taken" (EXIF) column to photos
-- Run once in the Supabase SQL Editor

ALTER TABLE photos ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
