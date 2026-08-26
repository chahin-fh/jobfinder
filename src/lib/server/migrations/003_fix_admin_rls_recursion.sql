-- ============================================
-- Migration 003: Fix "infinite recursion detected in policy for relation profiles"
--
-- Run this WHOLE script in the Supabase SQL Editor.
-- It prints what is currently in your database (diagnostics), then repairs
-- every admin policy to use the public.is_admin() helper instead of
-- selecting from profiles inside the policy (which causes the recursion).
--
-- Safe to run multiple times.
-- ============================================

-- ------------------------------------------------------------
-- 0. DIAGNOSTICS - shows the CURRENT state of your policies.
--    If the error persists after this script, copy the results
--    of these two queries back and we can see exactly what is wrong.
-- ------------------------------------------------------------
SELECT relname,
       relrowsecurity      AS rls_enabled,
       relforcerowsecurity AS force_rls
FROM pg_class
WHERE relname IN ('profiles', 'categories', 'queue_entries', 'matches', 'chat_messages');

SELECT polrelid::regclass                        AS "table",
       polname                                  AS policy,
       CASE polcmd
         WHEN 'r' THEN 'SELECT'
         WHEN 'a' THEN 'INSERT'
         WHEN 'w' THEN 'UPDATE'
         WHEN 'd' THEN 'DELETE'
         ELSE polcmd::text
       END                                      AS command,
       pg_get_expr(polqual, polrelid)           AS using_expression,
       pg_get_expr(polwithcheck, polrelid)      AS check_expression
FROM pg_policy
WHERE polrelid IN ('profiles'::regclass, 'categories'::regclass,
                   'queue_entries'::regclass, 'matches'::regclass, 'chat_messages'::regclass)
ORDER BY polrelid::regclass::text, polname;

-- ------------------------------------------------------------
-- 1. Helper function: is the current user an admin?
--    SECURITY DEFINER runs as the table owner, bypassing RLS, so
--    policies can call this without re-entering RLS on profiles.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin
  );
$$;

-- ------------------------------------------------------------
-- 2. Drop EVERY admin policy by name (old recursion-prone versions
--    included), then recreate them with public.is_admin().
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Admins can view all queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Admins can view all matches" ON matches;
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view all queue entries"
  ON queue_entries FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view all matches"
  ON matches FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view all messages"
  ON chat_messages FOR SELECT
  USING (public.is_admin());
