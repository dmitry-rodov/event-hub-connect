CREATE OR REPLACE FUNCTION public.cancel_rsvp(_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_prev_status rsvp_status;
  v_promoted_user uuid;
  v_promoted_id uuid;
  v_had_ticket boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  PERFORM 1 FROM public.events WHERE id = _event_id FOR UPDATE;

  -- Delete the user's ticket for this event (if any) so the spot is freed
  DELETE FROM public.tickets
  WHERE event_id = _event_id AND user_id = v_user
  RETURNING true INTO v_had_ticket;

  SELECT status INTO v_prev_status
  FROM public.rsvps
  WHERE event_id = _event_id AND user_id = v_user
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.rsvps
    SET status = 'cancelled', queue_position = NULL, updated_at = now()
    WHERE event_id = _event_id AND user_id = v_user;
  ELSIF NOT v_had_ticket THEN
    RAISE EXCEPTION 'no rsvp to cancel';
  ELSE
    -- ticket existed without rsvp (legacy / seeded). Treat as "going" being cancelled.
    v_prev_status := 'going';
  END IF;

  IF v_prev_status = 'going' OR v_had_ticket THEN
    SELECT id, user_id INTO v_promoted_id, v_promoted_user
    FROM public.rsvps
    WHERE event_id = _event_id AND status = 'waitlist'
    ORDER BY queue_position ASC NULLS LAST, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      UPDATE public.rsvps
      SET status = 'going', queue_position = NULL, updated_at = now()
      WHERE id = v_promoted_id;

      INSERT INTO public.tickets (event_id, user_id)
      VALUES (_event_id, v_promoted_user)
      ON CONFLICT (event_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'cancelled_status', v_prev_status,
    'promoted_user', v_promoted_user
  );
END;
$function$;