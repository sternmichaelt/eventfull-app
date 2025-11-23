-- Revert: Convert user_id columns back from TEXT to UUID
-- This requires authenticated users only (no guest users)
-- Run this in Supabase SQL Editor

-- 1. Events table
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
-- Convert TEXT back to UUID (only valid UUIDs will work)
ALTER TABLE events ALTER COLUMN user_id TYPE UUID USING 
  CASE 
    WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid
    ELSE NULL  -- Guest IDs will become NULL (you may want to delete these rows first)
  END;
-- Re-add foreign key constraint
ALTER TABLE events ADD CONSTRAINT events_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Timelines table
ALTER TABLE timelines DROP CONSTRAINT IF EXISTS timelines_user_id_fkey;
ALTER TABLE timelines ALTER COLUMN user_id TYPE UUID USING 
  CASE 
    WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid
    ELSE NULL
  END;
ALTER TABLE timelines ADD CONSTRAINT timelines_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Shared timelines table
ALTER TABLE shared_timelines DROP CONSTRAINT IF EXISTS shared_timelines_owner_user_id_fkey;
ALTER TABLE shared_timelines ALTER COLUMN owner_user_id TYPE UUID USING 
  CASE 
    WHEN owner_user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN owner_user_id::uuid
    ELSE NULL
  END;
ALTER TABLE shared_timelines ADD CONSTRAINT shared_timelines_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Photos table - Delete guest photos or set to NULL
-- Option A: Delete all guest photos (recommended)
DELETE FROM photos WHERE user_id::text LIKE 'guest-%';

-- Option B: Set guest photos to NULL (if you want to keep them)
-- UPDATE photos SET user_id = NULL WHERE user_id::text LIKE 'guest-%';

ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey;
ALTER TABLE photos ALTER COLUMN user_id TYPE UUID USING 
  CASE 
    WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid
    ELSE NULL
  END;
-- Make user_id NOT NULL (after cleaning guest data)
ALTER TABLE photos ALTER COLUMN user_id SET NOT NULL;
-- Note: You may need to add a foreign key constraint if you want to reference auth.users
-- ALTER TABLE photos ADD CONSTRAINT photos_user_id_fkey 
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. User settings table
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
-- Delete guest user settings
DELETE FROM user_settings WHERE user_id::text LIKE 'guest-%';
ALTER TABLE user_settings ALTER COLUMN user_id TYPE UUID USING 
  CASE 
    WHEN user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid
    ELSE NULL
  END;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Recreate indexes
DROP INDEX IF EXISTS idx_events_user_timeline;
CREATE INDEX IF NOT EXISTS idx_events_user_timeline ON events(user_id, timeline_id);

DROP INDEX IF EXISTS idx_timelines_user;
CREATE INDEX IF NOT EXISTS idx_timelines_user ON timelines(user_id);

DROP INDEX IF EXISTS idx_shared_timelines_email;
CREATE INDEX IF NOT EXISTS idx_shared_timelines_email ON shared_timelines(shared_with_email);

DROP INDEX IF EXISTS idx_photos_user;
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);

DROP INDEX IF EXISTS idx_user_settings_user;
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

-- All should show data_type = 'uuid'

