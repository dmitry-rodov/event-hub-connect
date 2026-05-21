import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Host Dashboard — Gather" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["my-hosts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_members")
        .select("role, host:hosts(id, slug, name, avatar_url, description)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Host Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Manage the hosts you belong to.</p>
        </div>
        <Button disabled><Plus className="mr-2 h-4 w-4" /> New Host</Button>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted md:col-span-2" />
        ) : memberships && memberships.length > 0 ? (
          memberships.map((m, i) => m.host && (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl">{m.host.name}</h3>
                  {m.host.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{m.host.description}</p>}
                  <div className="mt-3 inline-flex rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground capitalize">
                    {m.role}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/h/$hostSlug" params={{ hostSlug: m.host.slug }}>View page</Link>
                </Button>
                <Button variant="ghost" size="sm" disabled><Calendar className="mr-2 h-4 w-4" />Events</Button>
                <Button variant="ghost" size="sm" disabled><Users className="mr-2 h-4 w-4" />Members</Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground md:col-span-2">
            You're not a member of any host yet.
          </div>
        )}
      </div>
    </div>
  );
}
