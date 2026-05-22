CREATE OR REPLACE FUNCTION public.rsvp_event(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_event events%ROWTYPE;
  v_existing rsvps%ROWTYPE;
  v_has_existing boolean := false;
  v_going_count int;
  v_next_queue int;
  v_status rsvp_status;
  v_position int;
  v_rsvp_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = _event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_event.status <> 'published' THEN
    RAISE EXCEPTION 'event is not published';
  END IF;
  IF COALESCE(v_event.end_at, v_event.start_at) < now() THEN
    RAISE EXCEPTION 'event has ended';
  END IF;

  SELECT * INTO v_existing
  FROM public.rsvps
  WHERE event_id = _event_id AND user_id = v_user
  FOR UPDATE;
  v_has_existing := FOUND;

  IF v_has_existing AND v_existing.status IN ('going', 'waitlist') THEN
    RETURN jsonb_build_object(
      'rsvp_id', v_existing.id,
      'status', v_existing.status,
      'queue_position', v_existing.queue_position,
      'existing', true
    );
  END IF;

  SELECT count(*) INTO v_going_count
  FROM public.rsvps
  WHERE event_id = _event_id AND status = 'going';

  IF v_event.capacity IS NULL OR v_going_count < v_event.capacity THEN
    v_status := 'going';
    v_position := NULL;
  ELSE
    v_status := 'waitlist';
    SELECT COALESCE(max(queue_position), 0) + 1 INTO v_next_queue
    FROM public.rsvps
    WHERE event_id = _event_id AND status = 'waitlist';
    v_position := v_next_queue;
  END IF;

  IF v_has_existing THEN
    UPDATE public.rsvps
    SET status = v_status, queue_position = v_position, updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_rsvp_id;
  ELSE
    INSERT INTO public.rsvps (event_id, user_id, status, queue_position)
    VALUES (_event_id, v_user, v_status, v_position)
    RETURNING id INTO v_rsvp_id;
  END IF;

  IF v_status = 'going' THEN
    INSERT INTO public.tickets (event_id, user_id)
    VALUES (_event_id, v_user)
    ON CONFLICT (event_id, user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'rsvp_id', v_rsvp_id,
    'status', v_status,
    'queue_position', v_position,
    'existing', false
  );
END;
$function$;