import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/ImageUpload";
import { EventForm } from "@/components/EventForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";
import { slugify } from "@/lib/event-schema";

export const Route = createFileRoute("/_authenticated/events/$eventId/edit")({
  head: () => ({ meta: [{ title: "Edit Event — Gather" }] }),
  component: EditEvent,
});

function EditEvent() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-2xl px-6 py-12"><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  if (!event) return <div className="mx-auto max-w-2xl px-6 py-12">Event not found.</div>;

  async function setStatus(status: "draft" | "published") {
    setBusy(true);
    const { error } = await supabase.from("events").update({ status } as any).eq("id", eventId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Published" : "Unpublished");
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  }

  async function duplicate() {
    if (!user) return;
    setBusy(true);
    const payload: any = {
      host_id: event.host_id,
      created_by: user.id,
      title: `${event.title} (copy)`,
      slug: `${slugify(event.title)}-copy-${Math.random().toString(36).slice(2, 6)}`,
      description: event.description,
      timezone: event.timezone ?? "UTC",
      start_at: event.start_at,
      end_at: event.end_at,
      capacity: event.capacity,
      venue_type: event.venue_type ?? "physical",
      location: event.location,
      online_url: event.online_url,
      visibility: event.visibility,
      cover_image_url: event.cover_image_url,
      is_paid: false,
      status: "draft", // duplicates always start as draft
    };
    const { data, error } = await supabase.from("events").insert(payload).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Duplicated as draft");
    navigate({ to: "/events/$eventId/edit", params: { eventId: data.id } });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/events/$eventId" params={{ eventId }} className="text-sm text-muted-foreground hover:text-foreground">← Back to event</Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">{event.title}</h1>
          <div className="mt-2 flex gap-2">
            <Badge variant={event.status === "published" ? "default" : "secondary"} className="capitalize">{event.status}</Badge>
            <Badge variant="outline" className="capitalize">{event.visibility}</Badge>
          </div>
        </div>
      </div>

      <Card className="mt-6 flex flex-wrap gap-2 p-4">
        {event.status === "draft" ? (
          <Button size="sm" disabled={busy} onClick={() => setStatus("published")}><Eye className="mr-2 h-4 w-4" />Publish</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("draft")}><EyeOff className="mr-2 h-4 w-4" />Unpublish</Button>
        )}
        <Button size="sm" variant="outline" disabled={busy} onClick={duplicate}><Copy className="mr-2 h-4 w-4" />Duplicate</Button>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-xl">Cover image</h2>
        <p className="mb-4 text-sm text-muted-foreground">Wide image shown at the top of the event page.</p>
        <ImageUpload
          bucket="event-covers"
          folder={event.id}
          currentUrl={event.cover_image_url}
          label="Upload cover"
          onUploaded={async ({ publicUrl }) => {
            const { error } = await supabase.from("events").update({ cover_image_url: publicUrl } as any).eq("id", event.id);
            if (error) { toast.error(error.message); return; }
            qc.invalidateQueries({ queryKey: ["event", eventId] });
          }}
        />
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-4 font-display text-xl">Details</h2>
        <EventForm
          initial={{
            title: event.title,
            description: event.description ?? "",
            timezone: event.timezone ?? "UTC",
            start_at: event.start_at,
            end_at: event.end_at,
            capacity: event.capacity ?? 50,
            venue_type: event.venue_type ?? "physical",
            location: event.location,
            online_url: event.online_url,
            visibility: event.visibility,
            status: event.status,
            is_paid: event.is_paid ?? false,
            slug: event.slug,
          }}
          submitting={submitting}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            setSubmitting(true);
            const update: any = {
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
            const { error } = await supabase.from("events").update(update).eq("id", eventId);
            setSubmitting(false);
            if (error) { toast.error(error.message); return; }
            toast.success("Saved");
            qc.invalidateQueries({ queryKey: ["event", eventId] });
          }}
        />
      </Card>
    </div>
  );
}
