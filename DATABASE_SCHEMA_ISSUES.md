# Database Schema Issues Found

## Problem

Your current Supabase database has `user_id` columns defined as **UUID** with foreign key constraints to `auth.users(id)`. However, your application code uses **TEXT** guest IDs (like `"guest-1234567890-abc123"`) for users who haven't logged in yet.

This mismatch will cause:
- ❌ Foreign key constraint violations when inserting guest user data
- ❌ Type errors when trying to insert TEXT values into UUID columns
- ❌ Application failures when creating events, timelines, photos, etc.

## Current Database Schema Issues

### Tables with UUID user_id (needs fixing):

1. **events.user_id** - Currently UUID, needs to be TEXT
2. **timelines.user_id** - Currently UUID, needs to be TEXT  
3. **photos.user_id** - Currently UUID, needs to be TEXT
4. **shared_timelines.owner_user_id** - Currently UUID, needs to be TEXT
5. **user_settings.user_id** - Currently UUID, needs to be TEXT

## Solution

Run the migration script `supabase-migrate-to-text-userid.sql` in your Supabase SQL Editor to:

1. Drop foreign key constraints
2. Convert all `user_id` columns from UUID to TEXT
3. Recreate indexes
4. Verify the changes

## Why TEXT Instead of UUID?

- **Guest Users**: Your app supports guest users with IDs like `"guest-123..."` (TEXT)
- **Authenticated Users**: When users log in, Supabase provides UUIDs which can be stored as TEXT
- **Flexibility**: TEXT allows both guest and authenticated users to work seamlessly
- **Migration Path**: When you implement full authentication, UUIDs can be stored as TEXT strings

## After Migration

Once you run the migration:
- ✅ Guest users can create events, timelines, photos
- ✅ Authenticated users (UUIDs) will also work
- ✅ No foreign key constraint violations
- ✅ All existing data preserved (UUIDs converted to TEXT)

## Verification

After running the migration, verify with:

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

All `user_id` columns should show `data_type = 'text'`.

## Next Steps

1. **Run the migration**: Execute `supabase-migrate-to-text-userid.sql` in Supabase SQL Editor
2. **Test the app**: Try creating events, timelines, and photos
3. **Check console**: No foreign key errors should appear
4. **Future**: When implementing full auth, UUIDs from `auth.uid()` will work as TEXT strings


