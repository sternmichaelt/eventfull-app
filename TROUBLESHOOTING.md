# Troubleshooting Supabase Connection Issues

## Quick Diagnostic Steps

### Step 1: Open Browser Console
1. Go to your Netlify site
2. Press `F12` (or right-click → Inspect → Console tab)
3. Look for red error messages

### Step 2: Run Diagnostic Tool
In the browser console, type:
```javascript
window.debugSupabase()
```

This will show you:
- ✅/❌ Environment variables status
- ✅/❌ Supabase client initialization
- ✅/❌ Connection test results
- ✅/❌ Table accessibility
- ✅/❌ Schema verification

### Step 3: Check Common Issues

## Issue 1: "Supabase is not configured"

**Symptoms:**
- Error message: "Supabase is not configured"
- `window.debugSupabase()` shows environment variables as missing

**Solution:**
1. Go to Netlify Dashboard
2. Site Settings → Environment Variables
3. Verify these EXACT names (case-sensitive):
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
4. Values should be:
   - URL: `https://klhhdzyuyhxlqrggjvlh.supabase.co`
   - Key: Your anon key (starts with `eyJ...`)
5. **Trigger a new deployment** after adding/changing variables

## Issue 2: "relation does not exist" or "table does not exist"

**Symptoms:**
- Error: "relation 'events' does not exist"
- `window.debugSupabase()` shows tables as inaccessible

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase-setup.sql` (complete file)
3. Verify tables were created

## Issue 3: "foreign key constraint" or "user_id" errors

**Symptoms:**
- Error when creating events: "foreign key constraint violation"
- Error: "invalid input syntax for type uuid"

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase-migrate-to-text-userid.sql`
3. OR run `fix-schema-complete.sql` (more comprehensive)
4. Verify with `verify-schema.sql`

## Issue 4: "permission denied" or "RLS policy violation"

**Symptoms:**
- Error: "new row violates row-level security policy"
- Tables exist but can't insert/update

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run this to check policies:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```
3. All should show `rowsecurity = true`
4. Run `supabase-setup.sql` again to recreate policies with `USING (true)`

## Issue 5: Blank Page

**Symptoms:**
- Site loads but shows blank white page
- No errors in console

**Possible Causes:**
1. **Environment variables not set** → Check Netlify env vars
2. **JavaScript error** → Check browser console for errors
3. **Build failed** → Check Netlify build logs

**Solution:**
1. Check Netlify build logs for errors
2. Verify environment variables are set
3. Run `window.debugSupabase()` in console
4. Check browser console for JavaScript errors

## Issue 6: "JWT expired" or "Invalid API key"

**Symptoms:**
- Error: "JWT expired" or "Invalid API key"
- Connection fails with authentication error

**Solution:**
1. Verify your `REACT_APP_SUPABASE_ANON_KEY` is correct
2. Get fresh key from Supabase Dashboard → Settings → API
3. Update in Netlify environment variables
4. Trigger new deployment

## Verification Checklist

Run these in Supabase SQL Editor to verify:

### 1. Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('events', 'timelines', 'photos', 'photo_events', 'user_settings', 'shared_timelines');
```

### 2. Check user_id is TEXT
```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('events', 'timelines', 'photos', 'shared_timelines', 'user_settings')
  AND column_name LIKE '%user_id%';
```
All should show `data_type = 'text'`

### 3. Check RLS Policies
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('events', 'timelines', 'photos');
```
All should show `rowsecurity = true`

### 4. Test Insert
```sql
INSERT INTO events (user_id, timeline_id, title, date, category, importance)
VALUES ('guest-test-123', 'default', 'Test', NOW(), 'milestone', 5);
```
Should succeed without errors

## Still Not Working?

1. **Copy the exact error message** from browser console
2. **Run `window.debugSupabase()`** and copy the output
3. **Check Netlify build logs** for any build-time errors
4. **Verify environment variables** in Netlify (double-check spelling)
5. **Check Supabase dashboard** → Logs for database errors

## Quick Test Commands

In browser console:
```javascript
// Test connection
window.testSupabaseConnection()

// Detailed diagnostics
window.debugSupabase()

// Check if Supabase client exists
window.supabase ? '✅' : '❌'
```

