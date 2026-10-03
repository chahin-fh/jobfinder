CREATE OR REPLACE FUNCTION public.notify_on_engagement_agreed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_freelancer uuid;
  v_recipient uuid;
  v_link text := '/messages?match=' || NEW.match_id::text;
BEGIN
  SELECT client_id, freelancer_id
    INTO v_client, v_freelancer
    FROM matches
   WHERE id = NEW.match_id;

  IF v_client IS NULL OR v_freelancer IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'agreed' THEN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO notifications (user_id, kind, title, body, link)
      VALUES
        (v_client, 'engagement', 'Engagement agreed', 'Both sides confirmed the scope. Time to start.', v_link),
        (v_freelancer, 'engagement', 'Engagement agreed', 'Both sides confirmed the scope. Time to start.', v_link);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND
     OLD.scope IS NOT DISTINCT FROM NEW.scope AND
     OLD.amount IS NOT DISTINCT FROM NEW.amount AND
     OLD.currency IS NOT DISTINCT FROM NEW.currency AND
     OLD.created_by IS NOT DISTINCT FROM NEW.created_by THEN
    RETURN NEW;
  END IF;

  v_recipient := CASE
    WHEN NEW.created_by = v_client THEN v_freelancer
    ELSE v_client
  END;

  IF v_recipient <> NEW.created_by THEN
    INSERT INTO notifications (user_id, kind, title, body, link)
    VALUES (
      v_recipient,
      'proposal',
      'New terms to review',
      NEW.currency || ' ' || NEW.amount::text || ' | ' || left(NEW.scope, 120),
      v_link
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_engagement_agreed ON engagements;
CREATE TRIGGER on_engagement_agreed
  AFTER INSERT OR UPDATE ON engagements
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_engagement_agreed();