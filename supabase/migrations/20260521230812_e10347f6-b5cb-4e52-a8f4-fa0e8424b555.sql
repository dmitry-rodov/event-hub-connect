
-- rsvp_event: sign current user up for an event
CREATE OR REPLACE FUNCTION public.rsvp_event(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_event events%ROWTYPE;
  v_existing rsvps%ROWTYPE;
  v_going_count int;
  v_next_queue int;
  v_status rsvp_status;
  v_position int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  -- Lock the event row to serialize concurrent RSVPs for this event
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

  -- Return existing active RSVP if present
  SELECT * INTO v_existing
  FROM public.rsvps
  WHERE event_id = _event_id AND user_id = v_user
  FOR UPDATE;

  IF FOUND AND v_existing.status IN ('going', 'waitlist') THEN
    RETURN jsonb_build_object(
      'rsvp_id', v_existing.id,
      'status', v_existing.status,
      'queue_position', v_existing.queue_position,
      'existing', true
    );
  END IF;

  -- Count going seats
  SELECT count(*) INTO v_going_count
  FROM public.rsvps
  WHERE event_id = _event_id AND status = 'going';

  IF v_going_count < v_event.capacity THEN
    v_status := 'going';
    v_position := NULL;
  ELSE
    v_status := 'waitlist';
    SELECT COALESCE(max(queue_position), 0) + 1 INTO v_next_queue
    FROM public.rsvps
    WHERE event_id = _event_id AND status = 'waitlist';
    v_position := v_next_queue;
  END IF;

  IF FOUND THEN
    UPDATE public.rsvps
    SET status = v_status, queue_position = v_position, updated_at = now()
    WHERE id = v_existing.id;
    v_existing.id := v_existing.id;
  ELSE
    INSERT INTO public.rsvps (event_id, user_id, status, queue_position)
    VALUES (_event_id, v_user, v_status, v_position)
    RETURNING id INTO v_existing.id;
  END IF;

  IF v_status = 'going' THEN
    INSERT INTO public.tickets (event_id, user_id)
    VALUES (_event_id, v_user)
    ON CONFLICT (event_id, user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'rsvp_id', v_existing.id,
    'status', v_status,
    'queue_position', v_position,
    'existing', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rsvp_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid) TO authenticated;


-- cancel_rsvp: cancel current user's RSVP and promote next waitlist
CREATE OR REPLACE FUNCTION public.cancel_rsvp(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prev_status rsvp_status;
  v_promoted_user uuid;
  v_promoted_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

  -- Lock event row to serialize promotion logic
  PERFORM 1 FROM public.events WHERE id = _event_id FOR UPDATE;

  SELECT status INTO v_prev_status
  FROM public.rsvps
  WHERE event_id = _event_id AND user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no rsvp to cancel';
  END IF;

  UPDATE public.rsvps
  SET status = 'cancelled', queue_position = NULL, updated_at = now()
  WHERE event_id = _event_id AND user_id = v_user;

  IF v_prev_status = 'going' THEN
    -- Promote next FIFO waitlist row
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
$$;

REVOKE ALL ON FUNCTION public.cancel_rsvp(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_rsvp(uuid) TO authenticated;


-- increase_capacity: host-only, raise capacity and promote waitlist
CREATE OR REPLACE FUNCTION public.increase_capacity(_event_id uuid, _new_capacity int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_event events%ROWTYPE;
  v_going_count int;
  v_to_promote int;
  v_promoted int := 0;
  r record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;
  IF _new_capacity IS NULL OR _new_capacity <= 0 THEN
    RAISE EXCEPTION 'new_capacity must be greater than zero';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = _event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.has_host_role(v_user, v_event.host_id, 'host') THEN
    RAISE EXCEPTION 'host role required' USING ERRCODE = '42501';
  END IF;
  IF _new_capacity < v_event.capacity THEN
    RAISE EXCEPTION 'new_capacity cannot be less than current capacity';
  END IF;

  UPDATE public.events SET capacity = _new_capacity WHERE id = _event_id;

  SELECT count(*) INTO v_going_count
  FROM public.rsvps
  WHERE event_id = _event_id AND status = 'going';

  v_to_promote := GREATEST(_new_capacity - v_going_count, 0);

  FOR r IN
    SELECT id, user_id
    FROM public.rsvps
    WHERE event_id = _event_id AND status = 'waitlist'
    ORDER BY queue_position ASC NULLS LAST, created_at ASC
    LIMIT v_to_promote
    FOR UPDATE
  LOOP
    UPDATE public.rsvps
    SET status = 'going', queue_position = NULL, updated_at = now()
    WHERE id = r.id;

    INSERT INTO public.tickets (event_id, user_id)
    VALUES (_event_id, r.user_id)
    ON CONFLICT (event_id, user_id) DO NOTHING;

    v_promoted := v_promoted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'capacity', _new_capacity,
    'promoted', v_promoted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increase_capacity(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increase_capacity(uuid, int) TO authenticated;
