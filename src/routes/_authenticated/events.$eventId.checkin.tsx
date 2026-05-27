import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Check, Undo2, AlertCircle, Users, Clock, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$eventId/checkin")({
  head: () => ({ meta: [{ title: "Check-in — Gather" }] }),
  component: CheckinPage,
});

type ScanEntry = {
  checkinId: string;
  ticketId: string;
  code: string;
  attendeeName: string | null;
  at: string;
};

function CheckinPage() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<ScanEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load event + verify role (host or checker)
  const { data: ctx, isLoading: ctxLoading } = useQuery({
    queryKey: ["checkin-ctx", eventId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: event, error: evErr } = await supabase
        .from("events")
        .select("id, title, host_id, start_at")
        .eq("id", eventId)
        .maybeSingle();
      if (evErr) throw evErr;
      if (!event) return { event: null, allowed: false };

      const { data: membership } = await supabase
        .from("host_members")
        .select("role")
        .eq("host_id", event.host_id)
        .eq("user_id", user!.id)
        .in("role", ["host", "checker"])
        .maybeSingle();

      return { event, allowed: !!membership, role: membership?.role ?? null };
    },
  });

  // Live counters
  const { data: counters, refetch: refetchCounters } = useQuery({
    queryKey: ["checkin-counters", eventId],
    enabled: !!ctx?.allowed,
    queryFn: async () => {
      const [going, waitlist, checkedIn] = await Promise.all([
        supabase.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "going"),
        supabase.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "waitlist"),
        supabase.from("checkins").select("id", { count: "exact", head: true }).eq("event_id", eventId),
      ]);
      return {
        going: going.count ?? 0,
        waitlist: waitlist.count ?? 0,
        checkedIn: checkedIn.count ?? 0,
      };
    },
  });

  // Realtime invalidation
  useEffect(() => {
    if (!ctx?.allowed) return;
    const channel = supabase
      .channel(`checkin-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins", filter: `event_id=eq.${eventId}` },
        () => refetchCounters(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` },
        () => refetchCounters(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, ctx?.allowed, refetchCounters]);

  async function handleCheckin(e?: React.FormEvent) {
    e?.preventDefault();
    const raw = code.trim().toUpperCase();
    if (!raw) return;
    setSubmitting(true);
    try {
      // 1. find ticket by code AND event
      const { data: ticket, error: tErr } = await supabase
        .from("tickets")
        .select("id, user_id, event_id")
        .eq("event_id", eventId)
        .eq("code", raw)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!ticket) {
        toast.error("Ticket not found for this event");
        return;
      }

      // 2. block duplicate
      const { data: existing, error: exErr } = await supabase
        .from("checkins")
        .select("id, checked_in_at")
        .eq("ticket_id", ticket.id)
        .maybeSingle();
      if (exErr) throw exErr;
      if (existing) {
        toast.error(`Already checked in at ${new Date(existing.checked_in_at).toLocaleTimeString()}`);
        return;
      }

      // 3. insert checkin
      const { data: inserted, error: insErr } = await supabase
        .from("checkins")
        .insert({
          ticket_id: ticket.id,
          event_id: eventId,
          checked_in_by: user!.id,
        })
        .select("id, checked_in_at")
        .single();
      if (insErr) throw insErr;

      // 4. fetch attendee display name (best effort)
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", ticket.user_id)
        .maybeSingle();

      const entry: ScanEntry = {
        checkinId: inserted.id,
        ticketId: ticket.id,
        code: raw,
        attendeeName: profile?.display_name ?? null,
        at: inserted.checked_in_at,
      };
      setSession((s) => [entry, ...s]);
      toast.success(`Checked in ${entry.attendeeName ?? raw}`);
      setCode("");
      inputRef.current?.focus();
      qc.invalidateQueries({ queryKey: ["checkin-counters", eventId] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUndo() {
    const last = session[0];
    if (!last) return;
    const { error } = await supabase.from("checkins").delete().eq("id", last.checkinId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSession((s) => s.slice(1));
    toast.success(`Undid check-in for ${last.attendeeName ?? last.code}`);
    qc.invalidateQueries({ queryKey: ["checkin-counters", eventId] });
  }

  if (ctxLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!ctx?.event) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 text-center text-muted-foreground">
        Event not found.
      </div>
    );
  }

  if (!ctx.allowed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl">No access</h1>
          <p className="text-sm text-muted-foreground">
            Only host or checker members of this event can run check-in.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: "/events/$eventId", params: { eventId } })}>
            Back to event
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        to="/events/$eventId"
        params={{ eventId }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {ctx.event.title}
      </Link>
      <h1 className="mt-2 font-display text-4xl">Check-in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as <span className="font-medium">{ctx.role}</span>
      </p>

      {/* Counters */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Counter icon={<Users className="h-4 w-4" />} label="Going" value={counters?.going ?? 0} />
        <Counter icon={<Clock className="h-4 w-4" />} label="Waitlist" value={counters?.waitlist ?? 0} />
        <Counter icon={<BadgeCheck className="h-4 w-4" />} label="Checked-in" value={counters?.checkedIn ?? 0} accent />
      </div>

      {/* Manual entry */}
      <form onSubmit={handleCheckin} className="mt-8 flex gap-2">
        <Input
          ref={inputRef}
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="EVT-XXXXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="font-mono tracking-wider"
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting || !code.trim()}>
          <Check className="mr-2 h-4 w-4" />
          Check in
        </Button>
      </form>

      {/* Session log */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            This session ({session.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={session.length === 0}
          >
            <Undo2 className="mr-2 h-3.5 w-3.5" />
            Undo last
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {session.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No check-ins yet this session.
            </p>
          ) : (
            session.map((s) => (
              <div
                key={s.checkinId}
                className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{s.attendeeName ?? "Attendee"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{s.code}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(s.at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Counter({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card className={`p-4 ${accent ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </Card>
  );
}
