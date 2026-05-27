import { z } from "zod";

// Online URL: accept empty string when venue is physical (we validate via refine).
// Use plain string here so empty string from "physical" branch doesn't trip url().
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
    online_url: z.string().trim().max(500).optional().nullable(),
    visibility: z.enum(["public", "unlisted"]),
    status: z.enum(["draft", "published"]),
    is_paid: z.boolean(),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and dashes only"),
  })
  .superRefine((d, ctx) => {
    if (new Date(d.end_at) <= new Date(d.start_at)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["end_at"], message: "End must be after start" });
    }
    if (d.venue_type === "physical") {
      if (!d.location?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["location"], message: "Address is required for physical events" });
      }
    } else {
      const url = d.online_url?.trim() ?? "";
      if (!url) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["online_url"], message: "Online URL is required for online events" });
      } else {
        try {
          new URL(url);
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["online_url"], message: "Must be a valid URL" });
        }
      }
    }
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
