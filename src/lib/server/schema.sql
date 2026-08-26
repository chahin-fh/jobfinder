-- ============================================
-- JobFinder Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Categories (seed data)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (name, icon, description) VALUES
  ('Web Development', '🌐', 'Websites, web apps, and online platforms'),
  ('Mobile Development', '📱', 'iOS and Android applications'),
  ('Video Editing', '🎬', 'Video production, editing, and effects'),
  ('Graphic Design', '🎨', 'Logos, branding, and visual design'),
  ('Writing & Translation', '✍️', 'Content writing, copywriting, translation'),
  ('Data Entry', '📊', 'Data processing and virtual assistance'),
  ('Marketing', '📈', 'Digital marketing and SEO'),
  ('Music & Audio', '🎵', 'Music production, audio editing, voiceover')
ON CONFLICT DO NOTHING;

-- 2. User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('client', 'freelancer')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Queue entries
CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'freelancer')),
  category_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  matched_at TIMESTAMPTZ
);

ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue entries"
  ON queue_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue entry"
  ON queue_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entry"
  ON queue_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue entry"
  ON queue_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Allow server to read waiting entries for matching
CREATE POLICY "Service can read waiting entries"
  ON queue_entries FOR SELECT
  USING (status = 'waiting');

-- 4. Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  status TEXT DEFAULT 'chatting' CHECK (status IN ('chatting', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE POLICY "Users can insert matches"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE POLICY "Users can update their matches"
  ON matches FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

-- 5. Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their matches"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = chat_messages.match_id
      AND (matches.client_id = auth.uid() OR matches.freelancer_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their matches"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = chat_messages.match_id
      AND (matches.client_id = auth.uid() OR matches.freelancer_id = auth.uid())
    )
  );

-- 6. Profile details (columns on profiles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'Available now';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jobs_done INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS success_rate INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS response_time TEXT DEFAULT '1h';

-- 7. Profile skills
CREATE TABLE IF NOT EXISTS profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🛠️',
  level INT DEFAULT 50 CHECK (level BETWEEN 0 AND 100),
  sort_order INT DEFAULT 0
);

ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own skills"
  ON profile_skills FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 8. Profile portfolio projects
CREATE TABLE IF NOT EXISTS profile_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Web App',
  icon TEXT DEFAULT '💻',
  year INT,
  blurb TEXT DEFAULT '',
  gradient TEXT DEFAULT 'g1',
  sort_order INT DEFAULT 0
);

ALTER TABLE profile_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolio"
  ON profile_portfolio FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 9. Profile languages
CREATE TABLE IF NOT EXISTS profile_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

ALTER TABLE profile_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own languages"
  ON profile_languages FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 10. Profile reviews (reviewer-written; editable while in prototype phase)
CREATE TABLE IF NOT EXISTS profile_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT DEFAULT '',
  rating INT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  review_date TEXT DEFAULT '',
  text TEXT DEFAULT '',
  sort_order INT DEFAULT 0
);

ALTER TABLE profile_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reviews"
  ON profile_reviews FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Enable realtime for matches and chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_entries;

-- NOTE: For the admin dashboard + category moderation feature, also run
-- migrations/002_admin_dashboard.sql (fresh installs run both files).
