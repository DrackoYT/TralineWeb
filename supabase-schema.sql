-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/qxorzwqxtakdtxehbsly/sql/new)

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash INTEGER DEFAULT 0,
  email TEXT DEFAULT '',
  notifications BOOLEAN DEFAULT false,
  bio TEXT DEFAULT '',
  google_id TEXT DEFAULT '',
  discord_id TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  picture TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entries (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the admin user (password: traline2024)
INSERT INTO users (username, password_hash, email, notifications, bio, google_id, discord_id, icon, picture, role, permissions)
VALUES ('Kael Tharion', 677149938, '', true, '', '', '', 'K', '', 'admin', '["manage_users","manage_entries","manage_notifications","manage_admins"]'::jsonb)
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  entry_id BIGINT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  id BIGSERIAL PRIMARY KEY,
  entry_id BIGINT REFERENCES entries(id) ON DELETE CASCADE,
  comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT reactions_target_check CHECK (
    (entry_id IS NOT NULL AND comment_id IS NULL) OR
    (entry_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS reactions_entry_unique ON reactions (entry_id, username, emoji) WHERE entry_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reactions_comment_unique ON reactions (comment_id, username, emoji) WHERE comment_id IS NOT NULL;

-- Allow public access (the app handles auth client-side)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on entries" ON entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reactions" ON reactions FOR ALL USING (true) WITH CHECK (true);
