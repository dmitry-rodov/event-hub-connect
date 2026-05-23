import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EyeOff, X, Flag, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Gather" }] }),
  component: ReportsQueue,
});

interface ReportRow {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  event_id: string | null;
  host_id: string | null;
  reporter_id: string;
  event?: { id: string; title: string; host_id: string } | null;
}

function parsePhotoId(details: string | null): string | null {
  if (!details) return null;
  const m = details.match(/^\[photo:([0-9a-f-]{36})\]/i);
  return m ? m[1] : null;
}

function ReportsQueue() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["host-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Only show reports about content the user hosts — exclude reports the user submitted themselves.
      const { data: memberRows } = await supabase
        .from("host_members")
        .select("host_id")
        .eq("user_id", user!.id)
        .eq("role", "host");
      const hostIds = (memberRows ?? []).map((m) => m.host_id);
      if (hostIds.length === 0) return [] as ReportRow[];

      const { data: ownEvents } = await supabase
        .from("events")
        .select("id")
        .in("host_id", hostIds);
      const eventIds = (ownEvents ?? []).map((e) => e.id);
      if (eventIds.length === 0) return [] as ReportRow[];

      const { data, error } = await supabase
        .from("reports")
        .select("id, reason, details, status, created_at, event_id, host_id, reporter_id, event:events(id, title, host_id)")
        .eq("status", "open")
        .neq("reporter_id", user!.id)
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  async function dismiss(id: string) {
    const { error } = await supabase.from("reports").update({ status: "dismissed" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dismissed");
    qc.invalidateQueries({ queryKey: ["host-reports"] });
  }

  async function hide(r: ReportRow) {
    const photoId = parsePhotoId(r.details);
    if (photoId) {
      const { error } = await supabase.from("gallery_photos").update({ hidden: true }).eq("id", photoId);
      if (error) { toast.error(error.message); return; }
    } else if (r.event_id) {
      // Unpublish the event (revert to draft) so it's no longer publicly discoverable
      const { error } = await supabase.from("events").update({ status: "draft" }).eq("id", r.event_id);
      if (error) { toast.error(error.message); return; }
    }
    await supabase.from("reports").update({ status: "resolved" }).eq("id", r.id);
    toast.success("Hidden");
    qc.invalidateQueries({ queryKey: ["host-reports"] });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 pb-24">
      <h1 className="font-display text-4xl">Reports</h1>
      <p className="mt-2 text-muted-foreground">Open reports for events you host.</p>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        ) : !reports || reports.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            No open reports. <Flag className="ml-1 inline h-4 w-4" />
          </div>
        ) : (
          reports.map((r) => {
            const photoId = parsePhotoId(r.details);
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                        {photoId ? "Gallery photo" : "Event"}
                      </span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 font-medium">{r.reason}</div>
                    {r.event && (
                      <Link
                        to="/events/$eventId"
                        params={{ eventId: r.event.id }}
                        className="mt-1 block text-sm text-muted-foreground hover:text-foreground"
                      >
                        → {r.event.title}
                      </Link>
                    )}
                    {r.details && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{r.details}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {r.event && (
                      <Button asChild size="sm" variant="default">
                        <Link to="/events/$eventId" params={{ eventId: r.event.id }}>
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />View event
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => hide(r)}>
                      <EyeOff className="mr-1.5 h-3.5 w-3.5" />Hide
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => dismiss(r.id)}>
                      <X className="mr-1.5 h-3.5 w-3.5" />Dismiss
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
