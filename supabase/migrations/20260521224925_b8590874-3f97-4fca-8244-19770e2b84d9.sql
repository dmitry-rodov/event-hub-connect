
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('host-logos', 'host-logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-uploads', 'gallery-uploads', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-public', 'gallery-public', true);

-- Policies for host-logos (public read)
CREATE POLICY "host-logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'host-logos');

CREATE POLICY "host-logos authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'host-logos');

CREATE POLICY "host-logos authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'host-logos')
WITH CHECK (bucket_id = 'host-logos');

CREATE POLICY "host-logos authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'host-logos');

-- Policies for event-covers (public read)
CREATE POLICY "event-covers public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-covers');

CREATE POLICY "event-covers authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-covers');

CREATE POLICY "event-covers authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-covers')
WITH CHECK (bucket_id = 'event-covers');

CREATE POLICY "event-covers authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-covers');

-- Policies for gallery-uploads (private, read by policy only)
CREATE POLICY "gallery-uploads authenticated read own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'gallery-uploads' AND owner = auth.uid());

CREATE POLICY "gallery-uploads authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery-uploads');

CREATE POLICY "gallery-uploads authenticated update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery-uploads' AND owner = auth.uid())
WITH CHECK (bucket_id = 'gallery-uploads');

CREATE POLICY "gallery-uploads authenticated delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery-uploads' AND owner = auth.uid());

-- Policies for gallery-public (public read only for approved assets)
CREATE POLICY "gallery-public approved read"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-public');

CREATE POLICY "gallery-public authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery-public');

CREATE POLICY "gallery-public authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery-public')
WITH CHECK (bucket_id = 'gallery-public');

CREATE POLICY "gallery-public authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery-public');
