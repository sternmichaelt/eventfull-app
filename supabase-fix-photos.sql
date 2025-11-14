-- Fix photos table to support guest users
-- Run this in Supabase SQL Editor if photos table already exists

-- Drop the foreign key constraint if it exists
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey;

-- Change user_id from UUID to TEXT to support guest users
ALTER TABLE photos ALTER COLUMN user_id TYPE TEXT;

-- Recreate index if needed
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);

