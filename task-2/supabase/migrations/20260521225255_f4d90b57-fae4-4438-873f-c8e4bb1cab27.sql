
-- Gallery moderation
DO $$ BEGIN
  CREATE TYPE public.gallery_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.gallery_photos
  ADD COLUMN IF NOT EXISTS status public.gallery_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS public_path text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Update SELECT policy: approved viewable by all; uploader + host members see all
DROP POLICY IF EXISTS "Gallery viewable by all" ON public.gallery_photos;
CREATE POLICY "Approved gallery viewable by all"
  ON public.gallery_photos FOR SELECT
  USING (
    status = 'approved'
    OR uploaded_by = auth.uid()
    OR has_host_role(auth.uid(), (SELECT host_id FROM public.events WHERE id = gallery_photos.event_id), 'host'::host_role)
  );

-- Host members can update status (approve/reject)
DROP POLICY IF EXISTS "Host members moderate gallery" ON public.gallery_photos;
CREATE POLICY "Host members moderate gallery"
  ON public.gallery_photos FOR UPDATE
  USING (has_host_role(auth.uid(), (SELECT host_id FROM public.events WHERE id = gallery_photos.event_id), 'host'::host_role))
  WITH CHECK (has_host_role(auth.uid(), (SELECT host_id FROM public.events WHERE id = gallery_photos.event_id), 'host'::host_role));

-- ============ STORAGE POLICIES — replace open ones ============

-- host-logos: only host members of {host_id} folder
DROP POLICY IF EXISTS "host-logos authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "host-logos authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "host-logos authenticated delete" ON storage.objects;

CREATE POLICY "host-logos host write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'host-logos'
    AND has_host_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'host'::host_role)
  );
CREATE POLICY "host-logos host update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'host-logos' AND has_host_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'host'::host_role))
  WITH CHECK (bucket_id = 'host-logos' AND has_host_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'host'::host_role));
CREATE POLICY "host-logos host delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'host-logos' AND has_host_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'host'::host_role));

-- event-covers: only host members of the event's host; folder = {event_id}
DROP POLICY IF EXISTS "event-covers authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "event-covers authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "event-covers authenticated delete" ON storage.objects;

CREATE POLICY "event-covers host write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-covers'
    AND has_host_role(
      auth.uid(),
      (SELECT host_id FROM public.events WHERE id = ((storage.foldername(name))[1])::uuid),
      'host'::host_role
    )
  );
CREATE POLICY "event-covers host update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND has_host_role(auth.uid(), (SELECT host_id FROM public.events WHERE id = ((storage.foldername(name))[1])::uuid), 'host'::host_role)
  )
  WITH CHECK (
    bucket_id = 'event-covers'
    AND has_host_role(auth.uid(), (SELECT host_id FROM public.events WHERE id = ((storage.foldername(name))[1])::uuid), 'host'::host_role)
  );
CREATE POLICY "event-covers host delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND has_host_role(auth.uid(), (SELECT host_id FROM public.events WHERE id = ((storage.foldername(name))[1])::uuid), 'host'::host_role)
  );

-- gallery-uploads: user can only access own {user_id} folder
DROP POLICY IF EXISTS "gallery-uploads authenticated read own" ON storage.objects;
DROP POLICY IF EXISTS "gallery-uploads authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "gallery-uploads authenticated update own" ON storage.objects;
DROP POLICY IF EXISTS "gallery-uploads authenticated delete own" ON storage.objects;

CREATE POLICY "gallery-uploads read own or host"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'gallery-uploads'
    AND (
      ((storage.foldername(name))[1])::uuid = auth.uid()
      OR has_host_role(
        auth.uid(),
        (SELECT host_id FROM public.events WHERE id = ((storage.foldername(name))[2])::uuid),
        'host'::host_role
      )
    )
  );
CREATE POLICY "gallery-uploads write own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gallery-uploads'
    AND ((storage.foldername(name))[1])::uuid = auth.uid()
  );
CREATE POLICY "gallery-uploads delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gallery-uploads'
    AND ((storage.foldername(name))[1])::uuid = auth.uid()
  );

-- gallery-public: only host members can publish; folder = {event_id}
DROP POLICY IF EXISTS "gallery-public authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "gallery-public authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "gallery-public authenticated delete" ON storage.objects;

CREATE POLICY "gallery-public host write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gallery-public'
    AND has_host_role(
      auth.uid(),
      (SELECT host_id FROM public.events WHERE id = ((storage.foldername(name))[1])::uuid),
      'host'::host_role
    )
  );
CREATE POLICY "gallery-public host delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gallery-public'
    AND has_host_role(
      auth.uid(),
      (SELECT host_id FROM public.events WHERE id = ((storage.foldername(name))[1])::uuid),
      'host'::host_role
    )
  );
