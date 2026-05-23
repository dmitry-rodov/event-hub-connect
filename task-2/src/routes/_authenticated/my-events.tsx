import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Users, Hourglass, CheckCircle2, Pencil, ScanLine,
} from "lucide-react";
import { fetchHostedEvents, isPast, type HostedEvent } from "@/lib/hosted-events";


export const Route = createFileRoute("/_authenticated/my-events")({
  head: () => ({ meta: [{ title: "My Events — Gather" }] }),
  component: MyEvents,
});

function MyEvents() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["hosted-events", user?.id],
    enabled: !!user,
    queryFn: () => fetchHostedEvents(user!.id),
  });

  const [hostFilter, setHostFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const hosts = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of data ?? []) if (e.host) map.set(e.host.id, e.host.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [data]);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 86400_000 - 1 : null;
    const qLower = q.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (hostFilter !== "all" && e.host_id !== hostFilter) return false;
      const ts = new Date(e.start_at).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      if (qLower && !e.title.toLowerCase().includes(qLower)) return false;
      return true;
    });
  }, [data, hostFilter, from, to, q]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-24">
      <h1 className="font-display text-4xl">My Events</h1>
      <p className="mt-2 text-muted-foreground">Events you host or check in for.</p>

      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Host</Label>
            <Select value={hostFilter} onValueChange={setHostFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hosts</SelectItem>
                {hosts.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <Input placeholder="Title…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-3">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            No events match these filters.
          </div>
        ) : (
          filtered.map((e) => <EventCard key={e.id} ev={e} />)
        )}
      </div>
    </div>
  );
}

function EventCard({ ev }: { ev: HostedEvent }) {
  const past = isPast(ev);
  const isHost = ev.role === "host";

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link to="/events/$eventId" params={{ eventId: ev.id }} className="font-display text-lg hover:underline">
              {ev.title}
            </Link>
            {past && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Ended</span>}
          </div>
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
        {isHost && (
          <Button asChild size="sm" variant="outline">
            <Link to="/events/$eventId/edit" params={{ eventId: ev.id }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link to="/events/$eventId/checkin" params={{ eventId: ev.id }}>
            <ScanLine className="mr-1.5 h-3.5 w-3.5" />Check-in
          </Link>
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
