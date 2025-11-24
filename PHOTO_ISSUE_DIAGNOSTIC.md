# Photo Issue Diagnostic

## Potential Issues

1. **Database Schema Mismatch**: Photos table might still be TEXT instead of UUID
2. **RLS Policies**: May be blocking photo access
3. **Photo-Event Tagging**: Junction table might not be working
4. **Event Card Display**: Only shows `event.image`, not tagged photos
5. **User Filtering**: Photos might not be filtered correctly by user_id

## Quick Checks

Run in browser console:
```javascript
// Check if photos are being saved
window.debugSupabase()

// Check photos table
// In Supabase SQL Editor:
SELECT * FROM photos LIMIT 5;

// Check photo_events junction table
SELECT * FROM photo_events LIMIT 5;

// Check RLS policies
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('photos', 'photo_events');
```

