import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/signin" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="mx-auto max-w-4xl px-6 py-12"><div className="h-40 animate-pulse rounded-xl bg-muted" /></div>;
  }
  return <Outlet />;
}
