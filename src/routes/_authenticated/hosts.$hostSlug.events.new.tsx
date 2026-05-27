import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EventForm } from "@/components/EventForm";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hosts/$hostSlug/events/new")({
  head: () => ({ meta: [{ title: "New Event — Gather" }] }),
  component: NewEvent,
});

function NewEvent() {
  const { hostSlug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const { data: host, isLoading } = useQuery({
    queryKey: ["host", hostSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from("hosts").select("id, name, slug").eq("slug", hostSlug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-2xl px-6 py-12"><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  if (!host) return <div className="mx-auto max-w-2xl px-6 py-12">Host not found.</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/h/$hostSlug" params={{ hostSlug }} className="text-sm text-muted-foreground hover:text-foreground">← Back to {host.name}</Link>
      <h1 className="mt-4 font-display text-4xl">New event</h1>

      <div className="mt-8">
        <EventForm
          submitting={submitting}
          submitLabel="Create event"
          onSubmit={async (v) => {
            if (!user) return;
            setSubmitting(true);
            const payload: any = {
              host_id: host.id,
              created_by: user.id,
              title: v.title,
              slug: v.slug,
              description: v.description,
              timezone: v.timezone,
              start_at: v.start_at,
              end_at: v.end_at,
              capacity: v.capacity,
              venue_type: v.venue_type,
              location: v.venue_type === "physical" ? v.location : null,
              online_url: v.venue_type === "online" ? v.online_url : null,
              visibility: v.visibility,
              status: v.status,
              is_paid: v.is_paid,
            };
            const { data, error } = await supabase.from("events").insert(payload).select("id").single();
            setSubmitting(false);
            if (error) { toast.error(error.message); return; }
            toast.success("Event created");
            navigate({ to: "/events/$eventId/edit", params: { eventId: data.id } });
          }}
        />
      </div>
    </div>
  );
}
