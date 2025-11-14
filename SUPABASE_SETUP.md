# Supabase Backend Setup Guide

## Prerequisites
- Supabase account (https://supabase.com)
- Your Supabase project URL and anon key

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: eventfull-app (or your preferred name)
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
4. Wait for project to be created (2-3 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 3: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-setup.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Verify all tables were created:
   - Go to **Table Editor** and confirm you see:
     - `events`
     - `timelines`
     - `photos`
     - `photo_events`
     - `user_settings`
     - `shared_timelines`

## Step 4: Configure Environment Variables

### Local Development

Create a `.env` file in the project root:

```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: The `.env` file is already in `.gitignore` and will NOT be committed to GitHub.

### Production (Netlify)

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add:
   - **Key**: `REACT_APP_SUPABASE_URL`
   - **Value**: Your Supabase project URL
5. Add:
   - **Key**: `REACT_APP_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase anon key

## Step 5: Verify Connection

### Local Testing

1. Start the app: `npm start`
2. Open browser console (F12)
3. Run: `window.testSupabaseConnection()`
4. You should see:
   ```
   ✅ Supabase connection successful
   ✅ events: accessible
   ✅ timelines: accessible
   ✅ photos: accessible
   ...
   ```

### Production Testing

1. Deploy to Netlify
2. Open your deployed site
3. Check browser console for connection errors
4. Try creating an event to verify database writes

## Database Schema Overview

### Tables

1. **events**: Stores timeline events
   - `id` (BIGSERIAL)
   - `user_id` (UUID)
   - `timeline_id` (TEXT)
   - `title`, `description`, `date`, `category`, etc.

2. **timelines**: Stores user timelines
   - `id` (TEXT, primary key)
   - `user_id` (UUID)
   - `name` (TEXT)
   - `event_count` (INTEGER)

3. **photos**: General photo repository
   - `id` (BIGSERIAL)
   - `user_id` (UUID)
   - `url` (TEXT) - base64 encoded image
   - `name` (TEXT)
   - `category` (TEXT, default: 'untagged')

4. **photo_events**: Junction table for photo-event tagging
   - `photo_id` (BIGINT)
   - `event_id` (BIGINT)
   - Unique constraint on (photo_id, event_id)

5. **user_settings**: User preferences
   - `user_id` (UUID, unique)
   - `custom_categories` (JSONB)
   - `background_url` (TEXT)

6. **shared_timelines**: Timeline sharing
   - `timeline_id` (TEXT)
   - `owner_user_id` (UUID)
   - `shared_with_email` (TEXT)

## Row Level Security (RLS)

**Current Status**: RLS is enabled but policies are set to `USING (true)` for development.

**For Production**: Update policies to use proper authentication:
```sql
-- Example: Update events policy
DROP POLICY "Users can view own events" ON events;
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = user_id);
```

## Troubleshooting

### Connection Errors

1. **"Missing Supabase environment variables"**
   - Check `.env` file exists and has correct variable names
   - Ensure variables start with `REACT_APP_`
   - Restart dev server after creating/updating `.env`

2. **"Connection failed"**
   - Verify Supabase project is active
   - Check URL and key are correct
   - Ensure RLS policies allow access (currently set to allow all)

3. **"Table does not exist"**
   - Run `supabase-setup.sql` in Supabase SQL Editor
   - Check table names match exactly

### Common Issues

- **Photos not loading**: Check `photo_events` table has correct foreign keys
- **Events not saving**: Verify RLS policies allow INSERT
- **Timeline not loading**: Check `timelines` table exists and has data

## Next Steps

1. ✅ Database schema created
2. ✅ Environment variables configured
3. ⚠️ **Implement authentication** (replace guest user system)
4. ⚠️ **Update RLS policies** for production security
5. ⚠️ **Consider Supabase Storage** for photos (instead of base64 in database)

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: Check GitHub repository

