-- ============================================
-- Migration 002: Admin dashboard & category moderation
--
-- Run this in Supabase SQL Editor against an EXISTING database
-- (the one that already ran schema.sql).
-- Fresh installs: run schema.sql first, then this file.
--
-- Everything here is idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS /
-- CREATE OR REPLACE), so it is safe to re-run.
-- ============================================

-- 1. Categories: moderation columns
--    status   - 'approved' (visible to all) | 'pending' (awaiting review) | 'rejected' (deleted)
--    created_by - who requested the category
--    Existing rows get 'approved' via the column default, so current
--    categories stay visible after migrating.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('approved', 'pending', 'rejected'));
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 2. Profiles: admin flag (set to true via UPDATE, see step 7)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 3. Admin helper.
--    SECURITY DEFINER runs as the table owner, bypassing RLS. Policies call
--    public.is_admin() instead of selecting from profiles themselves - a
--    policy on profiles that queries profiles causes
--    "infinite recursion detected in policy for relation profiles".
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin
  );
$$;

-- 4. Categories RLS: approved visible to everyone, admins manage everything.
--    (This also replaces the earlier categories policies, dropping them by name.)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
DROP POLICY IF EXISTS "Authenticated users can create categories" ON categories;
DROP POLICY IF EXISTS "Admins can view all categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

-- Everyone can see approved categories (seed + admin-approved).
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (status = 'approved');

-- Admins can view all categories (including pending ones).
CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  USING (public.is_admin());

-- Signed-in users can submit a new category as a pending request.
CREATE POLICY "Authenticated users can request categories"
  ON categories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND status = 'pending' AND created_by = auth.uid());

-- Admins approve/reject/delete category requests.
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Admin read access to the rest of the data (powers the site reports)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all queue entries" ON queue_entries;
CREATE POLICY "Admins can view all queue entries"
  ON queue_entries FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all matches" ON matches;
CREATE POLICY "Admins can view all matches"
  ON matches FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
CREATE POLICY "Admins can view all messages"
  ON chat_messages FOR SELECT
  USING (public.is_admin());

-- 6. Guard against duplicate category names (case-insensitive).
--    NOTE: if this step fails because your database already contains two
--    categories with the same name, dedupe first (delete or merge one),
--    then re-run just this statement.
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique ON categories (LOWER(name));

-- 7. Make yourself an admin (replace the email with yours):
--    UPDATE profiles
--    SET is_admin = true
--    WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
