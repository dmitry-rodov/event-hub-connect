import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Ticket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({ meta: [{ title: "My Tickets — Gather" }] }),
  component: MyTickets,
});

function MyTickets() {
  const { user } = useAuth();
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, code, issued_at, event:events(id, title, start_at, location, cover_image_url)")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl">My Tickets</h1>
      <p className="mt-2 text-muted-foreground">Your passes for upcoming events.</p>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        ) : tickets && tickets.length > 0 ? (
          tickets.map((t) => (
            <Link key={t.id} to="/events/$eventId" params={{ eventId: t.event!.id }}>
              <Card className="flex items-center gap-4 overflow-hidden p-0 transition-shadow hover:shadow-md">
                <div className="aspect-square w-24 shrink-0 bg-gradient-to-br from-accent to-secondary">
                  {t.event?.cover_image_url && <img src={t.event.cover_image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 py-4">
                  <h3 className="font-display text-lg">{t.event?.title}</h3>
                  <div className="text-xs text-muted-foreground">{t.event && new Date(t.event.start_at).toLocaleString()}</div>
                  <div className="mt-1 font-mono text-xs text-primary">#{t.code.slice(0, 8)}</div>
                </div>
                <Ticket className="mr-5 h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          ))
        ) : (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            No tickets yet. <Link to="/" className="text-primary underline">Explore events</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
