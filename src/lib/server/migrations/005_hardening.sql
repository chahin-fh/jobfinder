-- ============================================
-- Migration 005: hardening + engagement/review/notification layer
--
-- Run this in the Supabase SQL Editor AFTER 002, 003 and 004.
-- It is written to be safe to re-run.
--
-- What it does
--   1. Removes the over-permissive "anyone can read waiting queue entries" policy
--      and replaces the client-side matching logic with one atomic SECURITY
--      DEFINER function. Matching no longer needs cross-user reads at all.
--   2. Guarantees one match per (client, freelancer, category).
--   3. Expires stale queue entries instead of matching them forever.
--   4. Auto-creates a profile row for every new auth user (and backfills).
--   5. Adds read receipts, engagements (agreement record, no money movement),
--      counterparty reviews, in-app notifications and avatars.
--   6. Adds a public_profiles view so a freelancer directory can be built
--      without exposing admin flags or emails.
-- ============================================

-- ------------------------------------------------------------
-- 1. Queue: remove the blanket read policy
-- ------------------------------------------------------------
-- This policy let ANY signed-in user read EVERY waiting queue entry (user ids +
-- categories). Matching now runs in public.try_match(), so it is no longer
-- needed and only leaked data.
DROP POLICY IF EXISTS "Service can read waiting entries" ON queue_entries;

-- Stale waiting entries should not be matchable forever.
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE queue_entries
   SET expires_at = created_at + interval '15 minutes'
 WHERE expires_at IS NULL;
ALTER TABLE queue_entries
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '15 minutes');

-- ------------------------------------------------------------
-- 2. One match per (client, freelancer, category)
-- ------------------------------------------------------------
-- Drop pre-existing duplicates first (cascades to their chat messages), then
-- enforce uniqueness so two simultaneous pollers can never create two threads.
DELETE FROM matches m
 USING matches d
 WHERE m.ctid < d.ctid
   AND m.client_id = d.client_id
   AND m.freelancer_id = d.freelancer_id
   AND m.category_id = d.category_id;

CREATE UNIQUE INDEX IF NOT EXISTS matches_pair_category_unique
  ON matches (client_id, freelancer_id, category_id);

-- ------------------------------------------------------------
-- 3. Profiles: one per auth user, created automatically
-- ------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing accounts so admin stats and notifications can reach them.
INSERT INTO public.profiles (id, name, role, email)
SELECT u.id,
       COALESCE(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1), 'User'),
       'freelancer',
       u.email
  FROM auth.users u
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles p
   SET email = u.email
  FROM auth.users u
 WHERE u.id = p.id
   AND (p.email IS NULL OR p.email <> u.email);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1), 'User'),
    'freelancer',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 4. Atomic matching
-- ------------------------------------------------------------
-- Runs as the owner (bypasses RLS) so it can look at other users' queue entries
-- without exposing them, and uses FOR UPDATE SKIP LOCKED so two callers can
-- never claim the same candidate concurrently.
DROP FUNCTION IF EXISTS public.try_match(uuid, text, uuid[]);

CREATE OR REPLACE FUNCTION public.try_match(
  p_user_id uuid,
  p_role text,
  p_category_ids uuid[]
)
RETURNS TABLE (
  match_id uuid,
  counterpart_id uuid,
  counterpart_name text,
  category_id uuid,
  category_name text,
  category_icon text,
  category_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry       queue_entries%ROWTYPE;
  v_match_id    uuid;
  v_category_id uuid;
BEGIN
  -- Anyone whose turn expired is out of the running.
  UPDATE queue_entries
     SET status = 'cancelled'
   WHERE status = 'waiting'
     AND expires_at IS NOT NULL
     AND expires_at < now();

  SELECT * INTO v_entry
    FROM queue_entries qe
   WHERE qe.status = 'waiting'
     AND qe.user_id <> p_user_id
     AND qe.role <> p_role
     AND qe.category_ids && p_category_ids
   ORDER BY qe.created_at
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT c INTO v_category_id
    FROM unnest(v_entry.category_ids) c
   WHERE c = ANY(p_category_ids)
   LIMIT 1;

  IF v_category_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO matches (client_id, freelancer_id, category_id)
  VALUES (
    CASE WHEN p_role = 'client' THEN p_user_id ELSE v_entry.user_id END,
    CASE WHEN p_role = 'freelancer' THEN p_user_id ELSE v_entry.user_id END,
    v_category_id
  )
  ON CONFLICT (client_id, freelancer_id, category_id)
  DO UPDATE SET status = matches.status
  RETURNING id INTO v_match_id;

  UPDATE queue_entries
     SET status = 'matched', matched_at = now()
   WHERE id = v_entry.id
      OR (user_id = p_user_id AND status = 'waiting');

  RETURN QUERY
    SELECT v_match_id,
           v_entry.user_id,
           COALESCE(p.name, 'User'),
           v_category_id,
           COALESCE(c.name, 'General'),
           COALESCE(c.icon, '💬'),
           COALESCE(c.description, '')
      FROM profiles p
      LEFT JOIN categories c ON c.id = v_category_id
     WHERE p.id = v_entry.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.try_match(uuid, text, uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.try_match(uuid, text, uuid[]) TO authenticated;

-- ------------------------------------------------------------
-- 5. Read receipts (unread counting that actually resets)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_reads (
  match_id     UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

ALTER TABLE match_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own read receipts" ON match_reads;
CREATE POLICY "Users manage own read receipts"
  ON match_reads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. Engagements - the agreed-upon scope/amount record.
--    No payment provider yet; this is the contract both sides sign off on.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS engagements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id                  UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL UNIQUE,
  scope                     TEXT NOT NULL DEFAULT '',
  amount                    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency                  TEXT NOT NULL DEFAULT 'USD',
  status                    TEXT NOT NULL DEFAULT 'proposed'
                              CHECK (status IN ('proposed', 'agreed', 'cancelled')),
  created_by                UUID REFERENCES profiles(id),
  agreed_by_client_at       TIMESTAMPTZ,
  agreed_by_freelancer_at   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their engagements" ON engagements;
CREATE POLICY "Participants can view their engagements"
  ON engagements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
       WHERE m.id = engagements.match_id
         AND (m.client_id = auth.uid() OR m.freelancer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can create their engagements" ON engagements;
CREATE POLICY "Participants can create their engagements"
  ON engagements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
       WHERE m.id = engagements.match_id
         AND (m.client_id = auth.uid() OR m.freelancer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can update their engagements" ON engagements;
CREATE POLICY "Participants can update their engagements"
  ON engagements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
       WHERE m.id = engagements.match_id
         AND (m.client_id = auth.uid() OR m.freelancer_id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 7. Counterparty reviews
--    Only a participant of a confirmed match can review the other side, once.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, author_id)
);

ALTER TABLE match_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view match reviews" ON match_reviews;
CREATE POLICY "Participants can view match reviews"
  ON match_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
       WHERE m.id = match_reviews.match_id
         AND (m.client_id = auth.uid() OR m.freelancer_id = auth.uid())
    )
    OR subject_id = auth.uid()
  );

DROP POLICY IF EXISTS "Counterparties can leave a review" ON match_reviews;
CREATE POLICY "Counterparties can leave a review"
  ON match_reviews FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND subject_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM matches m
       WHERE m.id = match_reviews.match_id
         AND m.status = 'confirmed'
         AND (m.client_id = auth.uid() OR m.freelancer_id = auth.uid())
    )
  );

-- Mirror each real review onto the subject's public profile so the existing
-- profile UI keeps working with genuine, non-self-authored reviews.
CREATE OR REPLACE FUNCTION public.sync_match_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_role text;
BEGIN
  SELECT name, role INTO v_name, v_role FROM profiles WHERE id = NEW.author_id;

  INSERT INTO profile_reviews (profile_id, reviewer_name, reviewer_role, rating, review_date, text)
  VALUES (
    NEW.subject_id,
    COALESCE(v_name, 'Anonymous'),
    COALESCE(v_role, ''),
    NEW.rating,
    to_char(NEW.created_at, 'Mon YYYY'),
    left(NEW.text, 400)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_review_created ON match_reviews;
CREATE TRIGGER on_match_review_created
  AFTER INSERT ON match_reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_match_review();

-- ------------------------------------------------------------
-- 8. In-app notifications (+ realtime)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'system',
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  link       TEXT NOT NULL DEFAULT '',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users only ever read/update their own notifications; rows are written by the
-- SECURITY DEFINER triggers below, so there is deliberately no INSERT policy.
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Notify both sides when a match is created.
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, kind, title, body, link)
  VALUES
    (NEW.client_id, 'match', 'You have a new match', 'Someone matched with you. Say hello before you lose the thread.', '/messages'),
    (NEW.freelancer_id, 'match', 'You have a new match', 'Someone matched with you. Say hello before you lose the thread.', '/messages');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_created ON matches;
CREATE TRIGGER on_match_created
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_match();

-- Notify the other participant when a message arrives.
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other uuid;
  v_name  text;
BEGIN
  SELECT CASE WHEN m.client_id = NEW.sender_id THEN m.freelancer_id ELSE m.client_id END
    INTO v_other
    FROM matches m
   WHERE m.id = NEW.match_id;

  IF v_other IS NULL OR v_other = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_name FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, kind, title, body, link)
  VALUES (v_other, 'message', COALESCE(v_name, 'Someone') || ' sent you a message', left(NEW.text, 120), '/messages');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_message_created ON chat_messages;
CREATE TRIGGER on_chat_message_created
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- Notify both sides once an engagement is fully agreed.
CREATE OR REPLACE FUNCTION public.notify_on_engagement_agreed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_free   uuid;
BEGIN
  IF NEW.status = 'agreed' AND OLD.status IS DISTINCT FROM 'agreed' THEN
    SELECT client_id, freelancer_id INTO v_client, v_free FROM matches WHERE id = NEW.match_id;

    INSERT INTO notifications (user_id, kind, title, body, link)
    VALUES
      (v_client, 'engagement', 'Engagement agreed', 'Both sides confirmed the scope. Time to start.', '/messages'),
      (v_free,   'engagement', 'Engagement agreed', 'Both sides confirmed the scope. Time to start.', '/messages');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_engagement_agreed ON engagements;
CREATE TRIGGER on_engagement_agreed
  AFTER UPDATE ON engagements
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_engagement_agreed();

-- ------------------------------------------------------------
-- 9. Avatars (Supabase Storage)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- A user may only write inside their own `<user-id>/...` folder.
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 10. Public directory view (no emails, no is_admin)
-- ------------------------------------------------------------
-- Views run with the owner's privileges, so this deliberately exposes a safe
-- column subset of every profile to signed-in users so a directory can exist.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id,
       name,
       role,
       title,
       bio,
       location,
       hourly_rate,
       availability,
       verified,
       jobs_done,
       success_rate,
       response_time,
       avatar_url,
       created_at
  FROM profiles;

REVOKE ALL ON public.public_profiles FROM public;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Contact details of the other participant of a match you belong to. Needed so
-- the server can email "you got a message" without exposing auth.users.
DROP FUNCTION IF EXISTS public.counterpart_contact(uuid);

CREATE OR REPLACE FUNCTION public.counterpart_contact(p_match_id uuid)
RETURNS TABLE (user_id uuid, name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.email
    FROM matches m
    JOIN profiles p
      ON p.id = CASE WHEN m.client_id = auth.uid() THEN m.freelancer_id ELSE m.client_id END
   WHERE m.id = p_match_id
     AND (m.client_id = auth.uid() OR m.freelancer_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.counterpart_contact(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.counterpart_contact(uuid) TO authenticated;

-- Skills for the directory. profile_skills is owner-only under RLS, so expose
-- just the presentational columns to signed-in users.
CREATE OR REPLACE VIEW public.public_skills AS
SELECT profile_id, name, icon, level, sort_order
  FROM profile_skills;

REVOKE ALL ON public.public_skills FROM public;
GRANT SELECT ON public.public_skills TO authenticated;

-- ------------------------------------------------------------
-- 11. Admin: real user count (auth.users is not reachable through RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_user_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_admin() THEN (SELECT count(*) FROM auth.users) ELSE 0::bigint END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_count() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_user_count() TO authenticated;

-- ------------------------------------------------------------
-- 12. Realtime for notifications
-- ------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
