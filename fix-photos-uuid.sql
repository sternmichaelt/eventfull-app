-- Fix photos table to use UUID (if migration wasn't run correctly)
-- Run this in Supabase SQL Editor

-- Check current schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'photos' AND column_name = 'user_id';

-- If it shows TEXT, run this:
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey;

-- Delete any guest photos (they won't work with UUID)
DELETE FROM photos WHERE user_id::text LIKE 'guest-%';

-- Convert to UUID (only valid UUIDs will remain)
ALTER TABLE photos ALTER COLUMN user_id TYPE UUID USING 
  CASE 
    WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid
    ELSE NULL
  END;

-- Make NOT NULL (after cleaning)
ALTER TABLE photos ALTER COLUMN user_id SET NOT NULL;

-- Recreate index
DROP INDEX IF EXISTS idx_photos_user;
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'photos' AND column_name = 'user_id';
-- Should show: data_type = 'uuid'

