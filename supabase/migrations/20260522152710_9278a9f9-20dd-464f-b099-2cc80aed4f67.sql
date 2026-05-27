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
  v_going_count int;
  v_next_queue int;
  v_status rsvp_status;
  v_position int;
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

  IF FOUND AND v_existing.status IN ('going', 'waitlist') THEN
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
$function$;

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
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000';
  END IF;

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

UPDATE public.events SET cover_image_url = 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1600&q=80' WHERE id = 'e1111111-1111-1111-1111-111111111111';
UPDATE public.events SET cover_image_url = 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80' WHERE id = 'e2222222-2222-2222-2222-222222222222';
UPDATE public.events SET cover_image_url = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80' WHERE id = 'e3333333-3333-3333-3333-333333333333';
UPDATE public.events SET cover_image_url = 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1600&q=80' WHERE id = 'e4444444-4444-4444-4444-444444444444';
UPDATE public.events SET cover_image_url = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80' WHERE id = 'e5555555-5555-5555-5555-555555555555';
UPDATE public.events SET cover_image_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1600&q=80' WHERE id = 'e6666666-6666-6666-6666-666666666666';

INSERT INTO public.host_members (host_id, user_id, role)
SELECT h.id, p.id, 'host'::host_role
FROM public.hosts h
CROSS JOIN public.profiles p
WHERE p.display_name = 'dmitryrodov'
ON CONFLICT DO NOTHING;