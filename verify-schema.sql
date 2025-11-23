-- Verification Script: Check if migration was successful
-- Run this in Supabase SQL Editor to verify your schema

-- 1. Check user_id column types (should all be TEXT)
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings')
  AND column_name LIKE '%user_id%'
ORDER BY table_name, column_name;

-- Expected result: All should show data_type = 'text'

-- 2. Check if foreign key constraints still exist (should be dropped)
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings')
  AND kcu.column_name LIKE '%user_id%';

-- Expected result: Should return 0 rows (no foreign keys)

-- 3. Test inserting a guest user event
INSERT INTO events (user_id, timeline_id, title, date, category, importance)
VALUES ('guest-test-' || gen_random_uuid()::text, 'default', 'Test Event', NOW(), 'milestone', 5)
RETURNING id, user_id;

-- If this works, delete the test event:
-- DELETE FROM events WHERE title = 'Test Event';

-- 4. Check RLS policies are set to allow all (for development)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings')
ORDER BY tablename, policyname;

-- Expected: qual should be 'true' for all policies

