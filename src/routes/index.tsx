import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Explore events — Gather" },
      { name: "description", content: "Browse upcoming events from hosts you'll love." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["explore-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, cover_image_url, location, start_at, host:hosts(slug, name, avatar_url)")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("start_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <section className="mb-12 max-w-2xl">
        <h1 className="font-display text-5xl leading-tight md:text-6xl">
          Find your next gathering.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Discover events from hosts around you — RSVP in a tap.
        </p>
      </section>

      <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-muted-foreground">Upcoming</h2>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }}>
              <Card className="group h-full overflow-hidden border-border/60 p-0 transition-all hover:shadow-lg hover:-translate-y-0.5">
                <div className="aspect-[4/3] w-full bg-gradient-to-br from-accent to-secondary">
                  {e.cover_image_url && <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />}
                </div>
                <div className="space-y-2 p-5">
                  <div className="text-xs text-muted-foreground">{e.host?.name}</div>
                  <h3 className="font-display text-xl leading-tight">{e.title}</h3>
                  <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(e.start_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No events yet. Be the first to host one.</p>
        </div>
      )}
    </div>
  );
}
