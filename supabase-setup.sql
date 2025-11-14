-- Events table
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  timeline_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL,
  importance INTEGER DEFAULT 5,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  journals JSONB DEFAULT '[]'::jsonb,
  recordings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timelines table
CREATE TABLE IF NOT EXISTS timelines (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  event_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared timelines table (for sharing functionality)
CREATE TABLE IF NOT EXISTS shared_timelines (
  id BIGSERIAL PRIMARY KEY,
  timeline_id TEXT REFERENCES timelines(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(timeline_id, shared_with_email)
);

-- Photos table (general photo repository)
CREATE TABLE IF NOT EXISTS photos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID to TEXT to support guest users
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'untagged',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo-Event junction table (tags photos to events)
CREATE TABLE IF NOT EXISTS photo_events (
  id BIGSERIAL PRIMARY KEY,
  photo_id BIGINT REFERENCES photos(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, event_id)
);

-- User settings table (for custom categories, backgrounds, etc.)
CREATE TABLE IF NOT EXISTS user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  custom_categories JSONB DEFAULT '{}'::jsonb,
  background_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Events policies (temporary: allows guest users, should be updated with proper auth)
DROP POLICY IF EXISTS "Users can view own events" ON events;
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own events" ON events;
CREATE POLICY "Users can insert own events" ON events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own events" ON events;
CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own events" ON events;
CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (true);

-- Timelines policies (temporary: allows guest users, should be updated with proper auth)
DROP POLICY IF EXISTS "Users can view own timelines" ON timelines;
CREATE POLICY "Users can view own timelines" ON timelines
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own timelines" ON timelines;
CREATE POLICY "Users can insert own timelines" ON timelines
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own timelines" ON timelines;
CREATE POLICY "Users can update own timelines" ON timelines
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own timelines" ON timelines;
CREATE POLICY "Users can delete own timelines" ON timelines
  FOR DELETE USING (true);

-- Shared timelines policies (temporary: allows guest users)
DROP POLICY IF EXISTS "Users can view shared timelines" ON shared_timelines;
CREATE POLICY "Users can view shared timelines" ON shared_timelines
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert shared timelines" ON shared_timelines;
CREATE POLICY "Users can insert shared timelines" ON shared_timelines
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete shared timelines" ON shared_timelines;
CREATE POLICY "Users can delete shared timelines" ON shared_timelines
  FOR DELETE USING (true);

-- Photos policies (temporary: allows guest users)
DROP POLICY IF EXISTS "Users can view own photos" ON photos;
CREATE POLICY "Users can view own photos" ON photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own photos" ON photos;
CREATE POLICY "Users can insert own photos" ON photos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own photos" ON photos;
CREATE POLICY "Users can update own photos" ON photos
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own photos" ON photos;
CREATE POLICY "Users can delete own photos" ON photos
  FOR DELETE USING (true);

-- Photo-Event junction policies (temporary: allows guest users)
DROP POLICY IF EXISTS "Users can view photo events" ON photo_events;
CREATE POLICY "Users can view photo events" ON photo_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert photo events" ON photo_events;
CREATE POLICY "Users can insert photo events" ON photo_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete photo events" ON photo_events;
CREATE POLICY "Users can delete photo events" ON photo_events
  FOR DELETE USING (true);

-- User settings policies (temporary: allows guest users)
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_user_timeline ON events(user_id, timeline_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_timelines_user ON timelines(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_timelines_email ON shared_timelines(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
CREATE INDEX IF NOT EXISTS idx_photo_events_photo ON photo_events(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_events_event ON photo_events(event_id);

