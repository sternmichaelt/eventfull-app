# Diagnostic Guide - Troubleshooting Supabase Errors

## Quick Diagnostic Steps

### 1. Check Browser Console
Open your Netlify site and press F12 to open browser console. Look for:
- Red error messages
- Supabase connection errors
- Database query errors

### 2. Test Connection
In browser console, run:
```javascript
window.testSupabaseConnection()
```

This will test:
- Supabase connection
- Table accessibility
- API functions

### 3. Common Issues & Solutions

#### Issue: "relation does not exist" or "table does not exist"
**Solution**: Run `supabase-setup.sql` in Supabase SQL Editor

#### Issue: "foreign key constraint" or "user_id" errors
**Solution**: Run `supabase-migrate-to-text-userid.sql` in Supabase SQL Editor

#### Issue: "permission denied" or "RLS policy violation"
**Solution**: Check RLS policies - they should be `USING (true)` for development

#### Issue: "Missing Supabase configuration"
**Solution**: 
1. Go to Netlify → Site Settings → Environment Variables
2. Verify `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set
3. Trigger a new deployment

#### Issue: Blank page or app won't load
**Solution**: 
1. Check Netlify build logs for errors
2. Verify environment variables are set
3. Check browser console for JavaScript errors

### 4. Verify Database Schema

Run this in Supabase SQL Editor to check your schema:

```sql
-- Check user_id column types
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings')
  AND column_name LIKE '%user_id%'
ORDER BY table_name, column_name;

-- All should show data_type = 'text'
```

### 5. Verify RLS Policies

Run this to check RLS policies:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings');

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings');
```

### 6. Test Direct Query

Try this in Supabase SQL Editor:

```sql
-- Test inserting a guest user event
INSERT INTO events (user_id, timeline_id, title, date, category, importance)
VALUES ('guest-test-123', 'default', 'Test Event', NOW(), 'milestone', 5);

-- If this works, the schema is correct
-- If it fails, check the error message
```

## Still Having Issues?

1. **Copy the exact error message** from browser console
2. **Check Netlify build logs** for any build-time errors
3. **Verify environment variables** are exactly:
   - `REACT_APP_SUPABASE_URL` (not `SUPABASE_URL`)
   - `REACT_APP_SUPABASE_ANON_KEY` (not `SUPABASE_KEY`)
4. **Check Supabase dashboard** → Logs for database errors

