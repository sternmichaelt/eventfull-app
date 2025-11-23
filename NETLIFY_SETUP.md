# Netlify Setup Guide

## Environment Variables in Netlify

Your `.env` file only works locally. For Netlify deployments, you must set environment variables in the Netlify dashboard.

### Steps:

1. **Go to Netlify Dashboard**
   - Visit https://app.netlify.com
   - Select your site

2. **Navigate to Environment Variables**
   - Go to **Site settings** → **Environment variables**
   - Or: **Build & deploy** → **Environment** → **Environment variables**

3. **Add These Variables:**

   **Variable 1:**
   - **Key**: `REACT_APP_SUPABASE_URL`
   - **Value**: `https://klhhdzyuyhxlqrggjvlh.supabase.co`

   **Variable 2:**
   - **Key**: `REACT_APP_SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaGhkenl1eWh4bHFyZ2dqdmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2Nzk5NTAsImV4cCI6MjA3MjI1NTk1MH0.6haZ9ADHKbgrJxM3h1xQDcq66YZIzWoyGQFIBLupyLs`

4. **Redeploy**
   - After adding variables, trigger a new deployment
   - Go to **Deploys** → **Trigger deploy** → **Deploy site**
   - Or push a new commit to trigger auto-deploy

## Important Notes

- Environment variables are case-sensitive
- Must use `REACT_APP_` prefix for React apps
- Changes require a new deployment to take effect
- The `.env` file is NOT used in Netlify (it's gitignored)

## Troubleshooting

If your Netlify site still shows errors:
1. ✅ Verify environment variables are set correctly
2. ✅ Trigger a new deployment
3. ✅ Check build logs for errors
4. ✅ Run the database migration in Supabase (supabase-migrate-to-text-userid.sql)

