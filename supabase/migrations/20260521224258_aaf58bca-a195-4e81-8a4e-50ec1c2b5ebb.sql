
REVOKE EXECUTE ON FUNCTION public.has_host_role(UUID, UUID, public.host_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_host_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
