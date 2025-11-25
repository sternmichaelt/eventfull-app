# Photo Not Showing - Complete Fix Guide

## Problem
Photos are not showing in the app, not attached to events, and not available in the photos section.

## Root Cause
The photos table `user_id` column type doesn't match what the app is sending:
- App sends: UUID (from authenticated user)
- Database expects: Either UUID or TEXT (mismatch causes failures)

## Solution Steps

### Step 1: Check Current Schema
Run in Supabase SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'photos' AND column_name = 'user_id';
```

**Expected Result**: `data_type = 'uuid'` (if using UUID authentication)

### Step 2: Fix Database Schema
Run `fix-photos-schema-final.sql` in Supabase SQL Editor.

This will:
- Convert `photos.user_id` to UUID
- Delete invalid photos
- Recreate indexes
- Verify the change

### Step 3: Check Browser Console
Open your app and check the browser console (F12). Look for:
- `createPhoto called:` - Shows when photo upload starts
- `Photo created successfully:` - Confirms photo was saved
- `fetchPhotos called:` - Shows when loading photos
- `fetchPhotos result:` - Shows how many photos were found

### Step 4: Test Photo Upload
1. Go to "Manage Photos"
2. Upload a photo
3. Check browser console for:
   - `createPhoto called:` with your user ID
   - Any error messages
   - `Photo created successfully:`

### Step 5: Test Photo Retrieval
1. After uploading, check if photo appears in list
2. Check console for:
   - `fetchPhotos called:` with your user ID
   - `fetchPhotos result:` showing the photo count

## Common Errors & Fixes

### Error: "invalid input syntax for type uuid"
**Cause**: Photos table is UUID but received non-UUID value
**Fix**: Run `fix-photos-schema-final.sql`

### Error: "invalid input syntax for type text"
**Cause**: Photos table is TEXT but received UUID
**Fix**: Run `fix-photos-schema-final.sql` (converts to UUID)

### Error: "permission denied" or "RLS policy violation"
**Cause**: RLS policies blocking access
**Fix**: Run `supabase-setup.sql` to recreate policies

### Photos upload but don't appear
**Cause**: `fetchPhotos` query not matching `user_id`
**Fix**: 
1. Check console for `fetchPhotos result:` - should show photos
2. Verify user_id in database matches your authenticated user ID
3. Run `test-photos-debug.sql` to check database

## Debugging Commands

### In Browser Console:
```javascript
// Test photo upload
window.debugSupabase()

// Check current user
const { data } = await supabase.auth.getSession();
console.log('User ID:', data.session?.user?.id);
```

### In Supabase SQL Editor:
```sql
-- Check your photos
SELECT id, user_id, name, category, created_at 
FROM photos 
ORDER BY created_at DESC 
LIMIT 10;

-- Check your user ID (from auth.users)
SELECT id, email FROM auth.users;
```

## Verification Checklist

After running the fix:
- [ ] Photos table `user_id` is UUID type
- [ ] Can upload photo without errors
- [ ] Photo appears in Manage Photos list
- [ ] Photo appears in Event Photos selector
- [ ] Can tag photo to event
- [ ] Photo appears in event card
- [ ] Photo appears in event gallery

## Still Not Working?

1. **Check browser console** for detailed error messages
2. **Run `test-photos-debug.sql`** in Supabase SQL Editor
3. **Verify you're signed in** - photos require authentication
4. **Check RLS policies** - should allow authenticated users
5. **Verify environment variables** are set in Netlify

