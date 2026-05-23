// Build a downloadable ICS calendar file for an event.

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIcsDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export interface IcsEventInput {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  startAt: string | Date;
  endAt?: string | Date | null;
}

export function buildIcs(ev: IcsEventInput): string {
  const start = toIcsDate(ev.startAt);
  // default 2h duration if no end
  const endSource = ev.endAt ?? new Date(new Date(ev.startAt).getTime() + 2 * 60 * 60 * 1000);
  const end = toIcsDate(endSource);
  const now = toIcsDate(new Date());

  const descriptionParts = [ev.description ?? "", ev.url ? `\n${ev.url}` : ""].filter(Boolean);
  const description = escapeIcs(descriptionParts.join(""));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gather//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
    ev.location ? `LOCATION:${escapeIcs(ev.location)}` : "",
    ev.url ? `URL:${ev.url}` : "",
    description ? `DESCRIPTION:${description}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const safeName = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;

  // Try a download via an anchor first (works in top-level pages).
  try {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = safeName;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    // Fallback: open the calendar file in a new tab. The browser will then
    // offer to download or open it with the user's calendar app. This path
    // is required inside sandboxed preview iframes where forced downloads
    // are blocked.
    window.open(dataUrl, "_blank", "noopener");
  }
}

