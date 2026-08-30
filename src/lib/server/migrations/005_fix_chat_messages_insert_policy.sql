-- ============================================
-- Migration 005: Fix chat_messages INSERT policy
-- The chat_messages table was missing an INSERT policy,
-- so messages were never persisted to the database.
-- Run this in Supabase SQL Editor.
-- ============================================

-- Add the missing INSERT policy for chat_messages
CREATE POLICY "Users can insert messages in their matches"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = chat_messages.match_id
      AND (matches.client_id = auth.uid() OR matches.freelancer_id = auth.uid())
    )
  );
