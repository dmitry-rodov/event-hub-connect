
-- 1) Restrict host contact_email visibility: revoke column-level SELECT from anon/authenticated.
-- Host members (server-side via has_host_role) still need access; they read via authenticated role,
-- so we add a per-row check via a security-definer accessor. Simplest: revoke column from anon only,
-- and add policy-aware access by replacing the open SELECT policy with one that excludes anon for contact_email.

REVOKE SELECT (contact_email) ON public.hosts FROM anon, authenticated;
GRANT SELECT (contact_email) ON public.hosts TO authenticated;

-- Now only authenticated users can read contact_email column. To further restrict to host members:
-- We rely on a view for public listing; but simplest acceptable fix is hiding from anonymous.
-- For stricter access, also revoke from authenticated and provide a secure RPC.
REVOKE SELECT (contact_email) ON public.hosts FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_host_contact_email(_host_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT contact_email
  FROM public.hosts
  WHERE id = _host_id
    AND public.is_host_member(auth.uid(), id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_host_contact_email(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_host_contact_email(uuid) TO authenticated;

-- 2) Tighten host_invites SELECT: remove the broad "true" policy.
-- Acceptance happens via supabaseAdmin in the acceptHostInvite server function,
-- so end users do not need direct SELECT on invites by token. Only host members
-- need to see the list of invites (already covered by "Host role manage invites").
DROP POLICY IF EXISTS "Authenticated can lookup invite by token" ON public.host_invites;
