# Production Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Database Setup (Supabase)
- [ ] Run `supabase-setup.sql` in Supabase SQL Editor (if not already done)
- [ ] Run `supabase-migrate-to-text-userid.sql` in Supabase SQL Editor (REQUIRED)
- [ ] Verify tables exist: events, timelines, photos, photo_events, user_settings, shared_timelines

### 2. Environment Variables

**Local Development:**
- ✅ `.env` file created with:
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`

**Netlify Production:**
- [ ] Go to Netlify Dashboard → Site Settings → Environment Variables
- [ ] Add `REACT_APP_SUPABASE_URL` = `https://klhhdzyuyhxlqrggjvlh.supabase.co`
- [ ] Add `REACT_APP_SUPABASE_ANON_KEY` = (your anon key)
- [ ] See `NETLIFY_SETUP.md` for detailed instructions

### 3. Build Verification
- ✅ Build passes: `npm run build`
- ✅ No critical errors
- ⚠️ Minor warnings (non-blocking)

### 4. Git Status
- ✅ `.env` file is in `.gitignore` (will NOT be committed)
- ✅ All code changes committed
- ✅ Ready to push to GitHub

## 🚀 Deployment Steps

### Step 1: Push to GitHub
```bash
git push origin main
```

### Step 2: Netlify Deployment
1. If using Netlify auto-deploy, it will trigger automatically
2. Or manually trigger: Netlify Dashboard → Deploys → Trigger deploy

### Step 3: Verify Environment Variables
- Check Netlify build logs to ensure env vars are loaded
- Verify no "Missing Supabase configuration" errors

### Step 4: Test Production Site
- [ ] Test creating an event
- [ ] Test editing an event
- [ ] Test photo uploads
- [ ] Test timeline management
- [ ] Check browser console for errors

## 📝 Important Notes

1. **Database Migration**: The `supabase-migrate-to-text-userid.sql` migration MUST be run before the app will work. Without it, saving events will fail.

2. **Environment Variables**: The `.env` file is gitignored and will NOT be in the repository. Each environment (local, Netlify) needs its own variables.

3. **Build Output**: The `/build` folder is gitignored. Netlify will build it during deployment.

4. **Authentication**: Currently supports guest users. Full authentication can be added later.

## 🔧 Troubleshooting

**Error: "Supabase is not configured"**
- Check environment variables are set in Netlify
- Trigger a new deployment after adding variables

**Error: "Database schema error"**
- Run the migration script in Supabase SQL Editor
- Verify user_id columns are TEXT type

**Build fails on Netlify**
- Check build logs in Netlify dashboard
- Verify Node.js version compatibility
- Check for missing dependencies

## 📚 Documentation Files

- `SUPABASE_SETUP.md` - Database setup instructions
- `NETLIFY_SETUP.md` - Netlify environment variables guide
- `PRODUCTION_CHECKLIST.md` - Complete production readiness checklist
- `DATABASE_SCHEMA_ISSUES.md` - Database migration information

