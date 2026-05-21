import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().min(1, "Description is required").max(5000),
    timezone: z.string().trim().min(1, "Timezone is required"),
    start_at: z.string().min(1, "Start time is required"),
    end_at: z.string().min(1, "End time is required"),
    capacity: z.number().int().positive("Capacity must be greater than zero"),
    venue_type: z.enum(["physical", "online"]),
    location: z.string().trim().max(500).optional().nullable(),
    online_url: z.string().trim().url("Must be a valid URL").max(500).optional().nullable(),
    visibility: z.enum(["public", "unlisted"]),
    status: z.enum(["draft", "published"]),
    is_paid: z.boolean(),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and dashes only"),
  })
  .refine((d) => new Date(d.end_at) > new Date(d.start_at), {
    path: ["end_at"],
    message: "End must be after start",
  })
  .refine((d) => d.venue_type !== "physical" || !!d.location?.trim(), {
    path: ["location"],
    message: "Address is required for physical events",
  })
  .refine((d) => d.venue_type !== "online" || !!d.online_url?.trim(), {
    path: ["online_url"],
    message: "Online URL is required for online events",
  });

export type EventFormValues = z.infer<typeof eventSchema>;

export function getTimezones(): string[] {
  try {
    // @ts-ignore - supportedValuesOf is widely available
    const tz = Intl.supportedValuesOf?.("timeZone") as string[] | undefined;
    if (tz && tz.length) return tz;
  } catch {}
  return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo"];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120) || "event";
}
