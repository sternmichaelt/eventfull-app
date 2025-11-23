# Fix: Missing Environment Variables in Netlify

## The Problem
Your browser console shows:
```
Missing Supabase environment variables
Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
```

This means Netlify is not passing the environment variables to your app during build.

## Solution: Set Environment Variables in Netlify

### Step 1: Go to Netlify Dashboard
1. Visit https://app.netlify.com
2. Select your site

### Step 2: Navigate to Environment Variables
**Method A (Recommended):**
- Go to **Site settings** (gear icon)
- Click **Environment variables** in the left sidebar

**Method B:**
- Go to **Build & deploy** → **Environment** → **Environment variables**

### Step 3: Add Variables (CRITICAL - Exact Names Required)

Add these **EXACT** variable names (case-sensitive, must start with `REACT_APP_`):

**Variable 1:**
- **Key:** `REACT_APP_SUPABASE_URL`
- **Value:** `https://klhhdzyuyhxlqrggjvlh.supabase.co`
- **Scopes:** Select "All scopes" or "Production, Deploy previews, Branch deploys"

**Variable 2:**
- **Key:** `REACT_APP_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaGhkenl1eWh4bHFyZ2dqdmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2Nzk5NTAsImV4cCI6MjA3MjI1NTk1MH0.6haZ9ADHKbgrJxM3h1xQDcq66YZIzWoyGQFIBLupyLs`
- **Scopes:** Select "All scopes" or "Production, Deploy previews, Branch deploys"

### Step 4: Verify Variable Names
⚠️ **Common Mistakes:**
- ❌ `SUPABASE_URL` (missing `REACT_APP_` prefix)
- ❌ `REACT_APP_SUPABASE_URL_` (extra underscore)
- ❌ `react_app_supabase_url` (wrong case)
- ✅ `REACT_APP_SUPABASE_URL` (correct)

### Step 5: Trigger New Deployment
**IMPORTANT:** Environment variables only take effect on NEW deployments.

**Option A - Manual Deploy:**
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for build to complete

**Option B - Push to GitHub:**
1. Make a small change (add a comment, update README)
2. Commit and push to GitHub
3. Netlify will auto-deploy

### Step 6: Verify Variables Are Loaded
After deployment, check the build logs:
1. Go to **Deploys** tab
2. Click on the latest deploy
3. Click **Deploy log**
4. Look for: `REACT_APP_SUPABASE_URL` in the log (it will show as `REACT_APP_SUPABASE_URL=***`)

## Troubleshooting

### If variables still don't work after deployment:

1. **Check Build Logs:**
   - Look for any errors during build
   - Verify variables are being read (they show as `***` for security)

2. **Clear Netlify Cache:**
   - Go to **Site settings** → **Build & deploy** → **Build settings**
   - Click **Clear cache and retry deploy**

3. **Verify Variable Values:**
   - Double-check the URL is correct (no trailing slash)
   - Double-check the key is the full anon key (starts with `eyJ...`)

4. **Check Variable Scopes:**
   - Make sure variables are set for "Production" scope
   - Or set for "All scopes"

5. **Redeploy:**
   - After making changes, always trigger a new deployment

## Quick Verification

After deployment, open your site and run in browser console:
```javascript
// Check if variables are loaded (they won't show values for security)
console.log('URL set:', !!process.env.REACT_APP_SUPABASE_URL);
console.log('Key set:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);

// Or run the diagnostic
window.debugSupabase()
```

If both show `true`, the variables are loaded correctly.

## Still Not Working?

1. **Check Netlify Build Logs** - Look for any errors
2. **Verify you're looking at the Production deploy** (not a preview)
3. **Try clearing browser cache** and hard refresh (Ctrl+Shift+R)
4. **Check if variables are set for the correct branch** (usually `main`)

