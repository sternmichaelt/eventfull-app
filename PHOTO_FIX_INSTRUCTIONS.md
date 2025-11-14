# Photo Upload Fix Instructions

## Problem
Photos weren't being saved to Supabase because the database schema expected `user_id` to be a UUID (for authenticated users), but the app uses guest IDs (strings) for users who haven't logged in yet.

## Solution
Updated the database schema to support both guest users (TEXT user_id) and future authenticated users.

## Steps to Fix

### 1. Update Database Schema

If you've already run the initial `supabase-setup.sql`, you need to run this migration:

**Run `supabase-fix-photos.sql` in Supabase SQL Editor:**

```sql
-- Fix photos table to support guest users
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey;
ALTER TABLE photos ALTER COLUMN user_id TYPE TEXT;
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
```

### 2. If Starting Fresh

The updated `supabase-setup.sql` already has the correct schema (TEXT for user_id), so just run that file.

### 3. Verify the Fix

1. Open your app
2. Go to "Manage Photos"
3. Upload a photo
4. Check the browser console for any errors
5. The photo should appear in the list immediately
6. Refresh the page - the photo should still be there

## What Was Changed

### Database Schema
- Changed `photos.user_id` from `UUID REFERENCES auth.users(id)` to `TEXT NOT NULL`
- This allows guest users (with string IDs) to save photos
- When you implement authentication later, you can still use UUIDs as strings

### Code Improvements
1. **Better Error Handling**: `createPhoto` now logs detailed error information
2. **Per-Photo Error Handling**: If one photo fails, others can still succeed
3. **User Filtering**: `fetchPhotos` now filters by current user_id
4. **Validation**: Added validation for required photo fields

## Testing

After running the migration:

1. **Upload Single Photo**: Should save successfully
2. **Upload Multiple Photos**: Should save all successfully
3. **Check Console**: No errors should appear
4. **Refresh Page**: Photos should persist
5. **Delete Photo**: Should work correctly

## Troubleshooting

### Photos Still Not Saving

1. **Check Browser Console**: Look for error messages
2. **Check Supabase Logs**: Go to Supabase Dashboard → Logs → API Logs
3. **Verify Schema**: Run this in Supabase SQL Editor:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'photos' AND column_name = 'user_id';
   ```
   Should show `data_type = 'text'`

### Error: "column user_id is of type uuid but expression is of type text"

This means the migration didn't run. Run `supabase-fix-photos.sql` again.

### Error: "new row violates row-level security policy"

Check that RLS policies allow INSERT. The current policies should allow all operations (for development).

## Next Steps

When you implement authentication:
- The user_id will be a UUID string from `auth.uid()`
- The TEXT type will still work fine
- You can optionally migrate to UUID type later if needed

