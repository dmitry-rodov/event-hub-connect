import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Pencil, Check, X, Upload, Loader2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { approveGalleryPhoto, rejectGalleryPhoto } from "@/lib/gallery.functions";
import { ReportButton } from "@/components/ReportButton";
import { FeedbackSection } from "@/components/FeedbackSection";


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
        .select("status, queue_position")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { status: string; queue_position: number | null } | null;
    },
  });

  // Detect promotion: previously waitlisted, now going
  const [promoted, setPromoted] = useState(false);
  const prevStatusRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = rsvp?.status ?? null;
    if (prev === "waitlist" && curr === "going") setPromoted(true);
    prevStatusRef.current = curr;
  }, [rsvp?.status]);

  const { data: isHost } = useQuery({
    queryKey: ["is-host", event?.host_id, user?.id],
    enabled: !!user && !!event?.host_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", event!.host_id)
        .eq("user_id", user!.id)
        .eq("role", "host")
        .maybeSingle();
      return !!data;
    },
  });

  async function handleRsvp() {
    if (!user) {
      navigate({ to: "/signin", search: { redirect: `/events/${eventId}` } });
      return;
    }
    const { data, error } = await supabase.rpc("rsvp_event" as any, { _event_id: eventId });
    if (error) { toast.error(error.message); return; }
    const status = (data as any)?.status;
    const pos = (data as any)?.queue_position;
    toast.success(status === "going" ? "You're going!" : `You're on the waitlist (#${pos})`);
    qc.invalidateQueries({ queryKey: ["rsvp", eventId] });
  }

  async function handleCancel() {
    if (!user) return;
    const { error } = await supabase.rpc("cancel_rsvp" as any, { _event_id: eventId });
    if (error) { toast.error(error.message); return; }
    toast.success("RSVP cancelled");
    qc.invalidateQueries({ queryKey: ["rsvp", eventId] });
  }

  if (isLoading) return <div className="mx-auto max-w-4xl px-6 py-12"><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>;
  if (!event) return <div className="mx-auto max-w-4xl px-6 py-12">Event not found.</div>;

  const endsAt = event.end_at ? new Date(event.end_at).getTime() : new Date(event.start_at).getTime();
  const ended = endsAt < Date.now();

  return (
    <article className="mx-auto max-w-4xl px-6 py-10">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-secondary">
        {event.cover_image_url && <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />}
        {ended && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow">
            Ended
          </span>
        )}
        {isHost && (
          <Button asChild size="sm" variant="secondary" className="absolute right-3 top-3">
            <Link to="/events/$eventId/edit" params={{ eventId }}>
              <Pencil className="mr-2 h-3 w-3" /> Edit
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          {event.host && (
            <Link to="/h/$hostSlug" params={{ hostSlug: event.host.slug }} className="text-sm text-muted-foreground hover:text-foreground">
              {event.host.name}
            </Link>
          )}
          <h1 className="mt-2 font-display text-4xl md:text-5xl">{event.title}</h1>
          <RsvpStatusChip status={rsvp?.status} queuePosition={rsvp?.queue_position ?? null} promoted={promoted} />

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
            {ended ? (
              <p className="mt-3 text-sm text-muted-foreground">This event has ended.</p>
            ) : rsvp?.status === "going" ? (
              <>
                <p className="mt-3 text-sm font-medium">You're going 🎉</p>
                <Button onClick={handleCancel} variant="outline" className="mt-3 w-full" size="sm">Cancel RSVP</Button>
              </>
            ) : rsvp?.status === "waitlist" ? (
              <>
                <p className="mt-3 text-sm">On the waitlist — position <span className="font-medium">#{rsvp.queue_position ?? "?"}</span></p>
                <Button onClick={handleCancel} variant="outline" className="mt-3 w-full" size="sm">Leave waitlist</Button>
              </>
            ) : (
              <>
                <Button onClick={handleRsvp} className="mt-3 w-full" size="lg">I'm going</Button>
                {!user && <p className="mt-2 text-xs text-muted-foreground">Sign in to RSVP and get your ticket.</p>}
              </>
            )}
          </div>
        </aside>
      </div>

      <GallerySection eventId={eventId} isHost={!!isHost} />
    </article>
  );
}

function GallerySection({ eventId, isHost }: { eventId: string; isHost: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const approve = useServerFn(approveGalleryPhoto);
  const reject = useServerFn(rejectGalleryPhoto);

  const { data: photos } = useQuery({
    queryKey: ["gallery", eventId, user?.id, isHost],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, url, public_path, status, uploaded_by, caption, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleUpload(file: File) {
    if (!user) { toast.error("Sign in to upload"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${eventId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery-uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("gallery_photos").insert({
        event_id: eventId,
        uploaded_by: user.id,
        storage_path: path,
        url: "", // not visible until approved
        status: "pending",
      });
      if (insErr) throw insErr;
      toast.success("Photo submitted — pending host approval");
      qc.invalidateQueries({ queryKey: ["gallery", eventId] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const approved = photos?.filter((p) => p.status === "approved") ?? [];
  const pending = photos?.filter((p) => p.status !== "approved") ?? [];

  return (
    <section className="mt-16 border-t pt-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Gallery</h2>
        {user && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Share a photo
            </Button>
          </>
        )}
      </div>

      {approved.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {approved.map((p) => (
            <img key={p.id} src={p.url} alt={p.caption ?? ""} className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">No photos yet.</p>
      )}

      {isHost && pending.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Pending approval ({pending.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {pending.map((p) => (
              <PendingTile
                key={p.id}
                photoId={p.id}
                storagePath={p.public_path /* placeholder */}
                onApprove={async () => {
                  await approve({ data: { photoId: p.id } });
                  toast.success("Approved");
                  qc.invalidateQueries({ queryKey: ["gallery", eventId] });
                }}
                onReject={async () => {
                  await reject({ data: { photoId: p.id } });
                  toast.success("Rejected");
                  qc.invalidateQueries({ queryKey: ["gallery", eventId] });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PendingTile({
  photoId,
  onApprove,
  onReject,
}: {
  photoId: string;
  storagePath: string | null;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}) {
  const { data: signed } = useQuery({
    queryKey: ["pending-photo-signed", photoId],
    queryFn: async () => {
      // fetch storage_path directly
      const { data: row } = await supabase
        .from("gallery_photos")
        .select("storage_path")
        .eq("id", photoId)
        .maybeSingle();
      if (!row?.storage_path) return null;
      const { data } = await supabase.storage
        .from("gallery-uploads")
        .createSignedUrl(row.storage_path, 60 * 10);
      return data?.signedUrl ?? null;
    },
  });

  const [busy, setBusy] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-lg border">
      {signed ? (
        <img src={signed} alt="" className="aspect-square w-full object-cover" />
      ) : (
        <div className="aspect-square w-full animate-pulse bg-muted" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-background/90 p-2 backdrop-blur">
        <Button
          size="sm"
          variant="default"
          className="flex-1"
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onApprove(); } finally { setBusy(false); } }}
        >
          <Check className="mr-1 h-3 w-3" /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onReject(); } finally { setBusy(false); } }}
        >
          <X className="mr-1 h-3 w-3" /> Reject
        </Button>
      </div>
    </div>
  );
}

function RsvpStatusChip({
  status,
  queuePosition,
  promoted,
}: {
  status: string | undefined;
  queuePosition: number | null;
  promoted: boolean;
}) {
  if (!status) return null;
  let label = "";
  let cls = "";
  if (promoted && status === "going") {
    label = "Promoted from waitlist 🎉";
    cls = "bg-primary/15 text-primary border-primary/30";
  } else if (status === "going") {
    label = "Going";
    cls = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  } else if (status === "waitlist") {
    label = `Waitlisted${queuePosition ? ` · #${queuePosition}` : ""}`;
    cls = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  } else if (status === "cancelled") {
    label = "Cancelled";
    cls = "bg-muted text-muted-foreground border-border";
  } else {
    return null;
  }
  return (
    <span className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
