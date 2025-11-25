-- Final Fix: Ensure photos table user_id matches authentication (UUID)
-- Run this in Supabase SQL Editor to fix photo issues

-- Step 1: Check current schema
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'photos' AND column_name = 'user_id';

-- Step 2: If user_id is TEXT, convert to UUID
-- (This assumes you're using UUID authentication)

-- Drop constraint if exists
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey;

-- Delete any photos with invalid user_ids (guest photos, etc.)
DELETE FROM photos 
WHERE user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR user_id IS NULL;

-- Convert to UUID
ALTER TABLE photos ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Make NOT NULL
ALTER TABLE photos ALTER COLUMN user_id SET NOT NULL;

-- Recreate index
DROP INDEX IF EXISTS idx_photos_user;
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);

-- Step 3: Verify the change
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'photos' AND column_name = 'user_id';
-- Should show: data_type = 'uuid'

-- Step 4: Check RLS policies
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'photos';
-- Should show: rowsecurity = true

-- Step 5: Verify policies allow access
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'photos';
-- Should show policies with USING (true) for development

-- Step 6: Test query (replace with your actual user UUID)
-- SELECT * FROM photos WHERE user_id = 'your-user-uuid-here' LIMIT 5;

