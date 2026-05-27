
-- One feedback per attendee per event
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_event_user_unique UNIQUE (event_id, user_id);

-- Tighten insert policy: must be 'going' RSVP and after event end
DROP POLICY IF EXISTS "Attendees insert feedback after event end" ON public.feedback;

CREATE POLICY "Going attendees insert feedback after event end"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = feedback.event_id
      AND COALESCE(e.end_at, e.start_at) < now()
  )
  AND EXISTS (
    SELECT 1 FROM public.rsvps r
    WHERE r.event_id = feedback.event_id
      AND r.user_id = auth.uid()
      AND r.status = 'going'
  )
);
