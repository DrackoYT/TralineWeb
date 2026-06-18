-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qxorzwqxtakdtxehbsly/sql/new

-- Enable RLS on both tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all on users" ON users;
DROP POLICY IF EXISTS "Allow all on entries" ON entries;

-- Create policies that allow ALL operations (SELECT, INSERT, UPDATE, DELETE)
-- This works because the app handles auth client-side
CREATE POLICY "Allow all on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on entries" ON entries
  FOR ALL USING (true) WITH CHECK (true);
