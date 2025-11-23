# Migration Guide: Revert to UUID (Require Authentication)

This guide explains how to revert from TEXT guest user IDs back to UUID-only authentication.

## Changes Made

### 1. Database Schema
- **File**: `supabase-revert-to-uuid.sql`
- Converts all `user_id` columns from TEXT back to UUID
- Removes guest user data
- Re-adds foreign key constraints to `auth.users(id)`

### 2. Code Changes
- **File**: `src/api/events.js`
  - `getUserId()` now requires authentication (no guest fallback)
  - Throws error if user is not signed in

- **File**: `src/App.js`
  - Shows auth modal if user is not authenticated
  - Only loads data when user is signed in
  - Removed sample events fallback

## Migration Steps

### Step 1: Run Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase-revert-to-uuid.sql`
3. This will:
   - Convert user_id columns back to UUID
   - Delete all guest user data (photos, events, etc.)
   - Re-add foreign key constraints

### Step 2: Verify Migration
Run this in Supabase SQL Editor:
```sql
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings')
  AND column_name LIKE '%user_id%'
ORDER BY table_name, column_name;
```

All should show `data_type = 'uuid'`

### Step 3: Deploy Code Changes
The code changes are already in place. After deploying:
- Users must sign in to use the app
- No guest access allowed
- All data requires authenticated user UUID

## Important Notes

⚠️ **Data Loss**: Running the migration will DELETE all guest user data:
- Guest events
- Guest photos  
- Guest timelines
- Guest user settings

✅ **Authenticated Data**: All data from signed-in users will be preserved.

## User Experience

**Before (Guest Users):**
- Users could use app without signing in
- Guest IDs like `guest-1234567890-abc123` were used

**After (UUID Only):**
- Users must sign in or create account
- Only authenticated users with UUID can access data
- Auth modal shows automatically if not signed in

## Testing

1. **Sign Out** - Should show auth modal
2. **Try to create event** - Should require sign in
3. **Sign In** - Should load user's data
4. **Create event** - Should work with authenticated UUID

## Rollback

If you need to go back to guest users:
1. Run `supabase-migrate-to-text-userid.sql`
2. Revert code changes in `src/api/events.js` (restore guest user logic)
3. Revert changes in `src/App.js` (remove auth requirement)

