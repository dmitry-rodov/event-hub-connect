
-- Prevent duplicate memberships
ALTER TABLE public.host_members
  DROP CONSTRAINT IF EXISTS host_members_host_user_unique;
ALTER TABLE public.host_members
  ADD CONSTRAINT host_members_host_user_unique UNIQUE (host_id, user_id);

-- Auto-add creator as host on new host
CREATE OR REPLACE FUNCTION public.handle_new_host()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.host_members (host_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'host')
  ON CONFLICT (host_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_host_created ON public.hosts;
CREATE TRIGGER on_host_created
AFTER INSERT ON public.hosts
FOR EACH ROW EXECUTE FUNCTION public.handle_new_host();

-- Invites table
CREATE TABLE IF NOT EXISTS public.host_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  role public.host_role NOT NULL DEFAULT 'host',
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS host_invites_host_id_idx ON public.host_invites(host_id);

ALTER TABLE public.host_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Host role manage invites" ON public.host_invites;
CREATE POLICY "Host role manage invites"
  ON public.host_invites FOR ALL
  TO authenticated
  USING (has_host_role(auth.uid(), host_id, 'host'::host_role))
  WITH CHECK (has_host_role(auth.uid(), host_id, 'host'::host_role) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated can lookup invite by token" ON public.host_invites;
CREATE POLICY "Authenticated can lookup invite by token"
  ON public.host_invites FOR SELECT
  TO authenticated
  USING (true);
