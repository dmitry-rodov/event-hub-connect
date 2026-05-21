import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, host:hosts(id, slug, name, avatar_url, description)")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rsvp } = useQuery({
    queryKey: ["rsvp", eventId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("rsvps")
        .select("status")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  async function handleRsvp() {
    if (!user) { navigate({ to: "/signin" }); return; }
    const { error } = await supabase.from("rsvps").upsert(
      { event_id: eventId, user_id: user.id, status: "going" },
      { onConflict: "event_id,user_id" }
    );
    if (error) { toast.error(error.message); return; }
    await supabase.from("tickets").upsert(
      { event_id: eventId, user_id: user.id },
      { onConflict: "event_id,user_id" }
    );
    toast.success("You're going!");
    qc.invalidateQueries({ queryKey: ["rsvp", eventId] });
  }

  if (isLoading) return <div className="mx-auto max-w-4xl px-6 py-12"><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>;
  if (!event) return <div className="mx-auto max-w-4xl px-6 py-12">Event not found.</div>;

  return (
    <article className="mx-auto max-w-4xl px-6 py-10">
      <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-secondary">
        {event.cover_image_url && <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          {event.host && (
            <Link to="/h/$hostSlug" params={{ hostSlug: event.host.slug }} className="text-sm text-muted-foreground hover:text-foreground">
              {event.host.name}
            </Link>
          )}
          <h1 className="mt-2 font-display text-4xl md:text-5xl">{event.title}</h1>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(event.start_at).toLocaleString()}</span>
            {event.location && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location}</span>}
            {event.capacity && <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Cap. {event.capacity}</span>}
          </div>

          {event.description && (
            <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
              {event.description}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">RSVP</div>
            <Button onClick={handleRsvp} className="mt-3 w-full" size="lg" disabled={rsvp?.status === "going"}>
              {rsvp?.status === "going" ? "You're going" : "I'm going"}
            </Button>
            {!user && <p className="mt-2 text-xs text-muted-foreground">Sign in to RSVP and get your ticket.</p>}
          </div>
        </aside>
      </div>
    </article>
  );
}
