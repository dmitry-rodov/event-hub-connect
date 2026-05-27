import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const filtersSchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  from: z.string().optional().default(""), // ISO datetime
  to: z.string().optional().default(""),   // ISO datetime
  includePast: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(60),
});

export const exploreEvents = createServerFn({ method: "POST" })
  .inputValidator((input) => filtersSchema.parse(input))
  .handler(async ({ data }) => {
    // Always restrict to published + public (unlisted excluded from Explore)
    let query = supabaseAdmin
      .from("events")
      .select(
        "id, title, description, cover_image_url, location, start_at, end_at, host:hosts(slug, name, avatar_url)"
      )
      .eq("status", "published")
      .eq("visibility", "public");

    const nowIso = new Date().toISOString();
    if (!data.includePast) {
      // default upcoming only: end_at >= now (or start_at if end is null)
      query = query.or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${nowIso})`);
    }

    if (data.q) {
      const term = data.q.replace(/[,()]/g, " ").trim();
      if (term) {
        // case-insensitive match on title or description
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }
    }

    if (data.location) {
      query = query.ilike("location", `%${data.location}%`);
    }

    if (data.from) {
      query = query.gte("start_at", new Date(data.from).toISOString());
    }
    if (data.to) {
      query = query.lte("start_at", new Date(data.to).toISOString());
    }

    const { data: rows, error } = await query
      .order("start_at", { ascending: true })
      .limit(data.limit);

    if (error) {
      console.error("exploreEvents error", error);
      return { events: [], error: error.message };
    }

    return { events: rows ?? [], error: null as string | null };
  });
