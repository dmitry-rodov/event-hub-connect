
-- =========== EVENTS ===========
DROP POLICY IF EXISTS "Public events viewable by all" ON public.events;

CREATE POLICY "Public published events viewable by all"
  ON public.events FOR SELECT
  USING (status = 'published' AND visibility = 'public');

CREATE POLICY "Unlisted events viewable by signed-in"
  ON public.events FOR SELECT
  TO authenticated
  USING (status = 'published' AND visibility = 'unlisted');

CREATE POLICY "Host members view all own events"
  ON public.events FOR SELECT
  USING (is_host_member(auth.uid(), host_id));

-- =========== CHECKINS ===========
DROP POLICY IF EXISTS "Host members update checkins" ON public.checkins;
CREATE POLICY "Host members update checkins"
  ON public.checkins FOR UPDATE
  TO authenticated
  USING (is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = checkins.event_id)))
  WITH CHECK (is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = checkins.event_id)));

-- =========== FEEDBACK ===========
-- Replace blanket ALL policy with explicit ones: insert only after event ends.
DROP POLICY IF EXISTS "Users manage own feedback" ON public.feedback;

CREATE POLICY "Attendees insert feedback after event end"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = feedback.event_id
        AND COALESCE(e.end_at, e.start_at) < now()
    )
  );

CREATE POLICY "Users update own feedback"
  ON public.feedback FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own feedback"
  ON public.feedback FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =========== GALLERY: add `hidden` flag and apply to public read ===========
ALTER TABLE public.gallery_photos
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Approved gallery viewable by all" ON public.gallery_photos;
CREATE POLICY "Approved gallery viewable by all"
  ON public.gallery_photos FOR SELECT
  USING (
    (status = 'approved' AND hidden = false)
    OR uploaded_by = auth.uid()
    OR has_host_role(auth.uid(), (SELECT host_id FROM public.events WHERE id = gallery_photos.event_id), 'host'::host_role)
  );

-- =========== REPORTS ===========
CREATE POLICY "Host role view reports for own content"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    (host_id IS NOT NULL AND has_host_role(auth.uid(), host_id, 'host'::host_role))
    OR (event_id IS NOT NULL AND has_host_role(
          auth.uid(),
          (SELECT host_id FROM public.events WHERE id = reports.event_id),
          'host'::host_role))
  );

CREATE POLICY "Host role resolve reports for own content"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    (host_id IS NOT NULL AND has_host_role(auth.uid(), host_id, 'host'::host_role))
    OR (event_id IS NOT NULL AND has_host_role(
          auth.uid(),
          (SELECT host_id FROM public.events WHERE id = reports.event_id),
          'host'::host_role))
  )
  WITH CHECK (
    (host_id IS NOT NULL AND has_host_role(auth.uid(), host_id, 'host'::host_role))
    OR (event_id IS NOT NULL AND has_host_role(
          auth.uid(),
          (SELECT host_id FROM public.events WHERE id = reports.event_id),
          'host'::host_role))
  );
