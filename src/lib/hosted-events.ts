import { supabase } from "@/integrations/supabase/client";

export type HostRole = "host" | "checker";

export interface HostedEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  host_id: string;
  host: { id: string; name: string; slug: string } | null;
  role: HostRole;
  counts: { going: number; waitlist: number; checkedIn: number };
}

export async function fetchHostedEvents(userId: string): Promise<HostedEvent[]> {
  const { data: members, error: mErr } = await supabase
    .from("host_members")
    .select("host_id, role")
    .eq("user_id", userId);
  if (mErr) throw mErr;
  if (!members?.length) return [];

  // Highest role per host (host > checker)
  const roleByHost = new Map<string, HostRole>();
  for (const m of members) {
    const prev = roleByHost.get(m.host_id);
    if (!prev || (prev === "checker" && m.role === "host")) {
      roleByHost.set(m.host_id, m.role as HostRole);
    }
  }
  const hostIds = Array.from(roleByHost.keys());

  const { data: events, error: eErr } = await supabase
    .from("events")
    .select("id, title, start_at, end_at, host_id, host:hosts(id, name, slug)")
    .in("host_id", hostIds)
    .order("start_at", { ascending: false });
  if (eErr) throw eErr;
  if (!events?.length) return [];

  const eventIds = events.map((e) => e.id);
  const [rsvpsRes, checkinsRes] = await Promise.all([
    supabase.from("rsvps").select("event_id, status").in("event_id", eventIds),
    supabase.from("checkins").select("event_id").in("event_id", eventIds),
  ]);
  if (rsvpsRes.error) throw rsvpsRes.error;
  if (checkinsRes.error) throw checkinsRes.error;

  const counts = new Map<string, { going: number; waitlist: number; checkedIn: number }>();
  for (const id of eventIds) counts.set(id, { going: 0, waitlist: 0, checkedIn: 0 });
  for (const r of rsvpsRes.data ?? []) {
    const c = counts.get(r.event_id)!;
    if (r.status === "going") c.going++;
    else if (r.status === "waitlist") c.waitlist++;
  }
  for (const c of checkinsRes.data ?? []) {
    counts.get(c.event_id)!.checkedIn++;
  }

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    end_at: e.end_at,
    host_id: e.host_id,
    host: e.host as HostedEvent["host"],
    role: roleByHost.get(e.host_id)!,
    counts: counts.get(e.id)!,
  }));
}

export function isPast(ev: HostedEvent): boolean {
  const end = ev.end_at ?? ev.start_at;
  return new Date(end).getTime() < Date.now();
}

export async function exportAttendeesCsv(eventId: string, eventTitle: string) {
  const [rsvpsRes, ticketsRes] = await Promise.all([
    supabase
      .from("rsvps")
      .select("status, queue_position, created_at, user_id")
      .eq("event_id", eventId)
      .order("status")
      .order("created_at"),
    supabase.from("tickets").select("user_id, code").eq("event_id", eventId),
  ]);
  if (rsvpsRes.error) throw rsvpsRes.error;
  if (ticketsRes.error) throw ticketsRes.error;

  const userIds = Array.from(new Set((rsvpsRes.data ?? []).map((r) => r.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null }[] };

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]));
  const codeById = new Map((ticketsRes.data ?? []).map((t) => [t.user_id, t.code]));

  const rows: (string | number)[][] = [
    ["Name", "User ID", "Status", "Queue", "Ticket Code", "RSVP At"],
    ...(rsvpsRes.data ?? []).map((r) => [
      nameById.get(r.user_id) ?? "",
      r.user_id,
      r.status,
      r.queue_position ?? "",
      codeById.get(r.user_id) ?? "",
      new Date(r.created_at).toISOString(),
    ]),
  ];
  const csv = rows
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendees-${eventTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

