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
#variable_conflict use_column
DECLARE
  v_entry       queue_entries%ROWTYPE;
  v_match_id    uuid;
  v_category_id uuid;
BEGIN
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