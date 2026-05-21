import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/ImageUpload";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$eventId/edit")({
  head: () => ({ meta: [{ title: "Edit Event — Gather" }] }),
  component: EditEvent,
});

function EditEvent() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-2xl px-6 py-12"><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  if (!event) return <div className="mx-auto max-w-2xl px-6 py-12">Event not found.</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/events/$eventId" params={{ eventId }} className="text-sm text-muted-foreground hover:text-foreground">← Back to event</Link>
      <h1 className="mt-4 font-display text-4xl">{event.title}</h1>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-xl">Cover image</h2>
        <p className="mb-4 text-sm text-muted-foreground">Wide image shown at the top of the event page.</p>
        <ImageUpload
          bucket="event-covers"
          folder={event.id}
          currentUrl={event.cover_image_url}
          label="Upload cover"
          onUploaded={async ({ publicUrl }) => {
            const { error } = await supabase.from("events").update({ cover_image_url: publicUrl }).eq("id", event.id);
            if (error) return toast.error(error.message);
            qc.invalidateQueries({ queryKey: ["event", eventId] });
          }}
        />
      </Card>
    </div>
  );
}
