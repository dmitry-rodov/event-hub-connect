import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { exploreEvents } from "@/lib/explore.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Explore events — Gather" },
      { name: "description", content: "Browse upcoming events from hosts you'll love." },
    ],
  }),
  component: Explore,
});

type Filters = {
  q: string;
  location: string;
  from: string;
  to: string;
  includePast: boolean;
};

function Explore() {
  const [draft, setDraft] = useState<Filters>({ q: "", location: "", from: "", to: "", includePast: false });
  const [applied, setApplied] = useState<Filters>(draft);
  const fetchEvents = useServerFn(exploreEvents);

  const { data, isLoading } = useQuery({
    queryKey: ["explore-events", applied],
    queryFn: () => fetchEvents({ data: applied }),
  });

  const events = data?.events ?? [];
  const now = Date.now();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <section className="mb-10 max-w-2xl">
        <h1 className="font-display text-5xl leading-tight md:text-6xl">Find your next gathering.</h1>
        <p className="mt-4 text-lg text-muted-foreground">Discover events from hosts around you — RSVP in a tap.</p>
      </section>

      <Card className="mb-8 p-5">
        <form
          className="grid gap-4 md:grid-cols-5"
          onSubmit={(e) => { e.preventDefault(); setApplied(draft); }}
        >
          <div className="md:col-span-2">
            <Label htmlFor="q" className="text-xs">Search</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="q" className="pl-9" placeholder="Title or description" value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="loc" className="text-xs">Location</Label>
            <Input id="loc" className="mt-1" placeholder="City, venue…" value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input id="from" type="date" className="mt-1" value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" type="date" className="mt-1" value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          </div>

          <div className="flex items-center gap-3 md:col-span-3">
            <Switch id="past" checked={draft.includePast}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, includePast: v }))} />
            <Label htmlFor="past" className="cursor-pointer text-sm">Include past events</Label>
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => {
              const empty = { q: "", location: "", from: "", to: "", includePast: false };
              setDraft(empty); setApplied(empty);
            }}>Reset</Button>
            <Button type="submit">Apply</Button>
          </div>
        </form>
      </Card>

      <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {applied.includePast ? "Events" : "Upcoming"}
      </h2>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e: any) => {
            const endsAt = e.end_at ? new Date(e.end_at).getTime() : new Date(e.start_at).getTime();
            const ended = endsAt < now;
            return (
              <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }}>
                <Card className="group h-full overflow-hidden border-border/60 p-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-accent to-secondary">
                    {e.cover_image_url && <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />}
                    {ended && (
                      <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow">
                        Ended
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 p-5">
                    <div className="text-xs text-muted-foreground">{e.host?.name}</div>
                    <h3 className="font-display text-xl leading-tight">{e.title}</h3>
                    <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(e.start_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No events match your filters.</p>
        </div>
      )}
    </div>
  );
}
