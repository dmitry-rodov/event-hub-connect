import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-events")({
  head: () => ({ meta: [{ title: "My Events — Gather" }] }),
  component: MyEvents,
});

function MyEvents() {
  const { user } = useAuth();
  const { data: rsvps, isLoading } = useQuery({
    queryKey: ["my-rsvps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rsvps")
        .select("status, event:events(id, title, start_at, location, cover_image_url)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-4xl">My Events</h1>
      <p className="mt-2 text-muted-foreground">Events you've RSVP'd to.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted md:col-span-2" />
        ) : rsvps && rsvps.length > 0 ? (
          rsvps.map((r, i) => r.event && (
            <Link key={i} to="/events/$eventId" params={{ eventId: r.event.id }}>
              <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
                <div className="aspect-[16/9] bg-gradient-to-br from-accent to-secondary">
                  {r.event.cover_image_url && <img src={r.event.cover_image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg">{r.event.title}</h3>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(r.event.start_at).toLocaleDateString()}
                    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-accent-foreground">{r.status}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground md:col-span-2">
            No RSVPs yet.
          </div>
        )}
      </div>
    </div>
  );
}
