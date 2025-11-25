-- Debug script to check photos table status
-- Run this in Supabase SQL Editor to diagnose photo issues

-- 1. Check photos table schema
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'photos'
ORDER BY ordinal_position;

-- 2. Check if photos table exists and has data
SELECT COUNT(*) as total_photos FROM photos;

-- 3. Check user_id column type (should be UUID)
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'photos' AND column_name = 'user_id';

-- 4. Check sample photos (if any exist)
SELECT id, user_id, name, category, created_at 
FROM photos 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check RLS policies on photos table
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'photos';

-- 6. Check photo_events junction table
SELECT COUNT(*) as tagged_photos FROM photo_events;

-- 7. Check if there are any photos with invalid user_id
SELECT COUNT(*) as invalid_user_ids
FROM photos 
WHERE user_id IS NULL 
   OR user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

