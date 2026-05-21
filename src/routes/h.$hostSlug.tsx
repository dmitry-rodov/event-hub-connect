import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar, Globe } from "lucide-react";

export const Route = createFileRoute("/h/$hostSlug")({
  component: HostPage,
});

function HostPage() {
  const { hostSlug } = Route.useParams();
  const { data: host, isLoading } = useQuery({
    queryKey: ["host", hostSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from("hosts").select("*").eq("slug", hostSlug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["host-events", host?.id],
    enabled: !!host?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_at, cover_image_url, location")
        .eq("host_id", host!.id)
        .eq("status", "published")
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-12"><div className="h-48 animate-pulse rounded-xl bg-muted" /></div>;
  if (!host) return <div className="mx-auto max-w-5xl px-6 py-12">Host not found.</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="relative h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-secondary to-primary/20">
        {host.banner_url && <img src={host.banner_url} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="mt-6 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl">{host.name}</h1>
          {host.description && <p className="mt-2 max-w-xl text-muted-foreground">{host.description}</p>}
          {host.website && (
            <a href={host.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Globe className="h-3 w-3" /> {host.website}
            </a>
          )}
        </div>
      </div>

      <h2 className="mt-12 mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Events</h2>
      {events && events.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }}>
              <Card className="flex gap-4 overflow-hidden p-0 transition-shadow hover:shadow-md">
                <div className="aspect-square w-28 shrink-0 bg-gradient-to-br from-accent to-secondary">
                  {e.cover_image_url && <img src={e.cover_image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-col justify-center py-3 pr-3">
                  <h3 className="font-display text-lg leading-tight">{e.title}</h3>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />{new Date(e.start_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No upcoming events.</p>
      )}
    </div>
  );
}
