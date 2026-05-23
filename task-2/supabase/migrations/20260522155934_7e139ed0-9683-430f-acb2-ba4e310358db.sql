CREATE OR REPLACE FUNCTION public.event_attendance_counts(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_event public.events%ROWTYPE;
  v_going integer := 0;
  v_waitlist integer := 0;
  v_can_view boolean := false;
BEGIN
  SELECT * INTO v_event
  FROM public.events
  WHERE id = _event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002';
  END IF;

  v_can_view :=
    (v_event.status = 'published' AND v_event.visibility = 'public')
    OR (v_user IS NOT NULL AND v_event.status = 'published' AND v_event.visibility = 'unlisted')
    OR (v_user IS NOT NULL AND public.is_host_member(v_user, v_event.host_id));

  IF NOT v_can_view THEN
    RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    count(*) FILTER (WHERE status = 'going'),
    count(*) FILTER (WHERE status = 'waitlist')
  INTO v_going, v_waitlist
  FROM public.rsvps
  WHERE event_id = _event_id;

  RETURN jsonb_build_object(
    'going', COALESCE(v_going, 0),
    'waitlist', COALESCE(v_waitlist, 0),
    'capacity', v_event.capacity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.event_attendance_counts(uuid) TO anon, authenticated;