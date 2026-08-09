# AI Photo Sort setup

EventFull can group uploaded photos into existing (or new) timeline events using Claude Vision (`claude-sonnet-5`).

## What was added

- `supabase/functions/sort-photos` — Edge Function that calls Anthropic (API key stays on the server)
- `src/ai/PhotoClassifier.js` — app calls that function
- `src/components/PhotoSortReview.js` — review screen (apply / create / remove)
- Photo Library button: **Sort with AI**

## One-time setup

### 1. Anthropic API key

1. Create a key at [console.anthropic.com](https://console.anthropic.com/)
2. In your Supabase project, set the secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Or in the Supabase Dashboard: **Project Settings → Edge Functions → Secrets**.

### 2. Deploy the function

From the project root (with [Supabase CLI](https://supabase.com/docs/guides/cli) logged in):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy sort-photos
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided automatically to Edge Functions.

### 3. Use it in the app

1. Sign in to EventFull
2. Open **Photo Library** → upload photos (Manage) if needed
3. Optionally click **Select for AI**, then pick photos
4. Click **Sort with AI**
5. On the review screen:
   - Remove wrong photos with **X**
   - **Apply to event** for matches
   - **Create event** for new groups
   - Leftovers stay **Unassigned**

## Notes

- Model: **Claude Sonnet 5** (`claude-sonnet-5`) — high-resolution vision tier (up to ~2576px long edge), better for grouping photos by scene/detail.
- Photos must have public `https://` URLs (normal Supabase Storage uploads).
- Large batches are processed in chunks of ~12 images.
- The React app never sees your Anthropic API key.
- Redeploy the Edge Function after changing the model or prompt: `supabase functions deploy sort-photos`
- Camera date metadata (`taken_at`) is optional and not required for normal use or AI sorting.
