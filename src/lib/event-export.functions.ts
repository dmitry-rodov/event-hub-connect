import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  eventId: z.string().uuid(),
  kind: z.enum(["rsvps", "attendance"]),
});

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export const exportEventCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { eventId, kind } = data;

    // Load event using the user's RLS-scoped client to confirm access.
    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, slug, host_id")
      .eq("id", eventId)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!event) throw new Error("Event not found");

    // Authorize: must be host member (host or checker) of the event's host.
    const { data: member, error: mErr } = await supabase
      .from("host_members")
      .select("role")
      .eq("host_id", event.host_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!member) throw new Error("Forbidden: host membership required");

    // Fetch RSVPs and check-ins via admin (RLS already authorized above).
    const [rsvpsRes, checkinsRes] = await Promise.all([
      supabaseAdmin
        .from("rsvps")
        .select("user_id, status, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("checkins")
        .select("ticket_id, checked_in_at")
        .eq("event_id", eventId),
    ]);
    if (rsvpsRes.error) throw new Error(rsvpsRes.error.message);
    if (checkinsRes.error) throw new Error(checkinsRes.error.message);

    // Map checkins by user_id via tickets.
    const ticketIds = (checkinsRes.data ?? []).map((c) => c.ticket_id);
    const { data: tickets, error: tErr } = ticketIds.length
      ? await supabaseAdmin.from("tickets").select("id, user_id").in("id", ticketIds)
      : { data: [] as { id: string; user_id: string }[], error: null };
    if (tErr) throw new Error(tErr.message);
    const ticketUser = new Map((tickets ?? []).map((t) => [t.id, t.user_id]));
    const checkinByUser = new Map<string, string>();
    for (const c of checkinsRes.data ?? []) {
      const uid = ticketUser.get(c.ticket_id);
      if (uid) checkinByUser.set(uid, c.checked_in_at);
    }

    // Pick rows by kind.
    const rsvps = rsvpsRes.data ?? [];
    const rows = kind === "attendance"
      ? rsvps.filter((r) => checkinByUser.has(r.user_id))
      : rsvps;

    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

    // Names from profiles.
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] as { id: string; display_name: string | null }[] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? ""]));

    // Emails from auth.
    const emailById = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailById.set(uid, u.user?.email ?? "");
      }),
    );

    // Build CSV.
    const header = ["name", "email", "RSVP status", "check-in time"];
    const lines = [header.map(csvEscape).join(",")];
    for (const r of rows) {
      const ci = checkinByUser.get(r.user_id);
      lines.push([
        csvEscape(nameById.get(r.user_id) ?? ""),
        csvEscape(emailById.get(r.user_id) ?? ""),
        csvEscape(r.status),
        csvEscape(ci ? new Date(ci).toISOString() : ""),
      ].join(","));
    }
    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";

    const filename = `${event.slug}-${kind === "attendance" ? "attendance" : "rsvps"}-${ymd(new Date())}.csv`;

    return { filename, csv };
  });
