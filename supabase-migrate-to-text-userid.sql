-- Migration: Convert user_id columns from UUID to TEXT to support guest users
-- This allows both guest users (TEXT) and authenticated users (UUID as TEXT) to work
-- Run this in Supabase SQL Editor

-- 1. Events table
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE events ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 2. Timelines table
ALTER TABLE timelines DROP CONSTRAINT IF EXISTS timelines_user_id_fkey;
ALTER TABLE timelines ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 3. Shared timelines table
ALTER TABLE shared_timelines DROP CONSTRAINT IF EXISTS shared_timelines_owner_user_id_fkey;
ALTER TABLE shared_timelines ALTER COLUMN owner_user_id TYPE TEXT USING owner_user_id::text;

-- 4. Photos table (may already be TEXT if you ran the photo fix)
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey;
-- Handle NULL values by converting to TEXT, or set a default guest ID if NULL
ALTER TABLE photos ALTER COLUMN user_id TYPE TEXT USING 
  CASE 
    WHEN user_id IS NULL THEN 'guest-' || gen_random_uuid()::text
    ELSE user_id::text
  END;
-- Make it NOT NULL after conversion
ALTER TABLE photos ALTER COLUMN user_id SET NOT NULL;

-- 5. User settings table
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE user_settings ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_events_user_timeline ON events(user_id, timeline_id);
CREATE INDEX IF NOT EXISTS idx_timelines_user ON timelines(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_timelines_email ON shared_timelines(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings')
  AND column_name LIKE '%user_id%'
ORDER BY table_name, column_name;

