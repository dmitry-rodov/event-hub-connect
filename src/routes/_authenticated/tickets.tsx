import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Ticket as TicketIcon } from "lucide-react";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({ meta: [{ title: "My Tickets — Gather" }] }),
  component: MyTickets,
});

type TicketRow = {
  id: string;
  code: string;
  issued_at: string;
  event: {
    id: string;
    title: string;
    start_at: string;
    end_at: string | null;
    location: string | null;
    online_url: string | null;
    description: string | null;
    cover_image_url: string | null;
  } | null;
};

function MyTickets() {
  const { user } = useAuth();
  const nowIso = new Date().toISOString();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, code, issued_at, event:events!inner(id, title, start_at, end_at, location, online_url, description, cover_image_url)"
        )
        .eq("user_id", user!.id);
      if (error) throw error;
      const now = Date.now();
      const rows = (data ?? []) as unknown as TicketRow[];
      return rows
        .filter((t) => {
          if (!t.event) return false;
          const endsAt = t.event.end_at ? new Date(t.event.end_at).getTime() : new Date(t.event.start_at).getTime();
          return endsAt >= now;
        })
        .sort((a, b) => new Date(a.event!.start_at).getTime() - new Date(b.event!.start_at).getTime());
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl">My Tickets</h1>
      <p className="mt-2 text-muted-foreground">Your passes for upcoming events.</p>

      <div className="mt-8 space-y-6">
        {isLoading ? (
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        ) : tickets && tickets.length > 0 ? (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} />)
        ) : (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            No upcoming tickets. <Link to="/" className="text-primary underline">Explore events</Link>.
          </div>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: TicketRow }) {
  const ev = ticket.event;
  if (!ev) return null;

  const startsAt = new Date(ev.start_at);
  const locationLabel = ev.location ?? ev.online_url ?? null;

  function handleAddToCalendar() {
    const ics = buildIcs({
      uid: `${ticket.id}@gather`,
      title: ev!.title,
      description: ev!.description,
      location: ev!.location ?? ev!.online_url ?? null,
      url: ev!.online_url ?? `${window.location.origin}/events/${ev!.id}`,
      startAt: ev!.start_at,
      endAt: ev!.end_at,
    });
    const safeTitle = ev!.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "event";
    downloadIcs(safeTitle, ics);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(ticket.code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <Card id={`ticket-${ticket.id}`} className="scroll-mt-24 overflow-hidden p-0 ring-primary/40 target:ring-2">
      <div className="flex flex-col gap-0 md:flex-row">
        <Link
          to="/events/$eventId"
          params={{ eventId: ev.id }}
          className="relative aspect-[16/9] w-full shrink-0 bg-gradient-to-br from-accent to-secondary md:aspect-square md:w-44"
        >
          {ev.cover_image_url && (
            <img src={ev.cover_image_url} alt="" className="h-full w-full object-cover" />
          )}
        </Link>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <Link to="/events/$eventId" params={{ eventId: ev.id }}>
              <h3 className="font-display text-xl hover:underline">{ev.title}</h3>
            </Link>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {startsAt.toLocaleString()}
              </span>
              {locationLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-3">
            <div className="shrink-0 rounded-md bg-background p-2">
              <QRCodeSVG value={ticket.code} size={88} includeMargin={false} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Ticket code
              </div>
              <button
                onClick={copyCode}
                className="mt-1 break-all text-left font-mono text-sm font-semibold tracking-wider text-primary hover:underline"
                title="Click to copy"
              >
                {ticket.code}
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleAddToCalendar}>
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  Add to Calendar
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/events/$eventId" params={{ eventId: ev.id }}>
                    <TicketIcon className="mr-2 h-3.5 w-3.5" />
                    View event
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
