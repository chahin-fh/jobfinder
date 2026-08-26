-- ============================================
-- Migration 004: Fix matches INSERT policy
-- The matches table was missing an INSERT policy,
-- so RLS silently blocked match creation.
-- Run this in Supabase SQL Editor.
-- ============================================

-- Add the missing INSERT policy for matches
CREATE POLICY "Users can insert matches"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = client_id OR auth.uid() = freelancer_id);
