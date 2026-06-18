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

-- Allow public access (RLS disabled — the app handles auth client-side)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on entries" ON entries FOR ALL USING (true) WITH CHECK (true);
