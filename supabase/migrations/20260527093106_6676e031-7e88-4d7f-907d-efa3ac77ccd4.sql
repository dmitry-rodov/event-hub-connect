
-- 1) Restrict host_invites SELECT to creator only (keep host-role manage policy for INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Host role manage invites" ON public.host_invites;

CREATE POLICY "Invite creator can view"
  ON public.host_invites
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() AND public.has_host_role(auth.uid(), host_id, 'host'::host_role));

CREATE POLICY "Host role can create invites"
  ON public.host_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host'::host_role) AND created_by = auth.uid());

CREATE POLICY "Invite creator can update"
  ON public.host_invites
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND public.has_host_role(auth.uid(), host_id, 'host'::host_role))
  WITH CHECK (created_by = auth.uid() AND public.has_host_role(auth.uid(), host_id, 'host'::host_role));

CREATE POLICY "Invite creator can delete"
  ON public.host_invites
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() AND public.has_host_role(auth.uid(), host_id, 'host'::host_role));

-- 2) Hide hosts.contact_email from public/auth direct reads. Access still available via
-- public.get_host_contact_email() SECURITY DEFINER RPC for host members.
REVOKE SELECT (contact_email) ON public.hosts FROM anon, authenticated;

-- 3) Remove rsvps and tickets from the realtime publication to prevent broadcasting
-- row data to unauthorized subscribers. Clients should rely on query refetches instead.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rsvps'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.rsvps;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.tickets;
  END IF;
END $$;
