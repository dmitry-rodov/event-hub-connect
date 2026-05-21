CREATE POLICY "Host members can delete checkins"
ON public.checkins
FOR DELETE
TO authenticated
USING (
  is_host_member(auth.uid(), (SELECT events.host_id FROM events WHERE events.id = checkins.event_id))
);