import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Hourglass, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { fetchHostedEvents, isPast, type HostedEvent } from "@/lib/hosted-events";
import { exportEventCsv } from "@/lib/event-export.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Host Dashboard — Gather" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["hosted-events", user?.id],
    enabled: !!user,
    queryFn: () => fetchHostedEvents(user!.id),
  });

  // Host dashboard: only events where the user has the host role (exclude checker-only).
  const hostEvents = (data ?? []).filter((e) => e.role === "host");
  const upcoming = hostEvents.filter((e) => !isPast(e)).sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );
  const past = hostEvents.filter(isPast);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Host Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Events you host.</p>
        </div>
        <Button asChild>
          <Link to="/hosts/new"><Plus className="mr-2 h-4 w-4" /> New Host</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-10 h-40 animate-pulse rounded-xl bg-muted" />
      ) : hostEvents.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          You don't host any events yet.
          <div className="mt-4">
            <Button asChild size="sm"><Link to="/hosts/new">Create your first host</Link></Button>
          </div>
        </div>
      ) : (
        <>
          <Section title="Upcoming" events={upcoming} empty="No upcoming events." />
          <Section title="Past" events={past} empty="No past events." />
        </>
      )}
    </div>
  );
}

function Section({ title, events, empty }: { title: string; events: HostedEvent[]; empty: string }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">{title}</h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {events.map((e) => <EventRow key={e.id} ev={e} />)}
        </div>
      )}
    </section>
  );
}

function EventRow({ ev }: { ev: HostedEvent }) {
  const exportFn = useServerFn(exportEventCsv);

  async function doExport(kind: "rsvps" | "attendance") {
    try {
      const { filename, csv } = await exportFn({ data: { eventId: ev.id, kind } });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/events/$eventId" params={{ eventId: ev.id }} className="font-display text-lg hover:underline">
            {ev.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(ev.start_at).toLocaleString()}
            {ev.host && <span>· {ev.host.name}</span>}
            <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground capitalize">{ev.role}</span>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <Stat icon={<Users className="h-4 w-4" />} label="Going" value={ev.counts.going} />
          <Stat icon={<Hourglass className="h-4 w-4" />} label="Waitlist" value={ev.counts.waitlist} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Checked-in" value={ev.counts.checkedIn} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => doExport("rsvps")}>
          <Download className="mr-1.5 h-3.5 w-3.5" />Export RSVPs
        </Button>
        <Button size="sm" variant="outline" onClick={() => doExport("attendance")}>
          <Download className="mr-1.5 h-3.5 w-3.5" />Export attendance
        </Button>
      </div>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
      <div className="font-display text-xl tabular-nums">{value}</div>
    </div>
  );
}
