import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ApproveInput = z.object({ photoId: z.string().uuid() });

export const approveGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch the photo (RLS: host members can see all statuses)
    const { data: photo, error: fetchErr } = await supabase
      .from("gallery_photos")
      .select("id, event_id, storage_path, status")
      .eq("id", data.photoId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!photo) throw new Error("Photo not found");
    if (!photo.storage_path) throw new Error("Missing storage path");

    // Verify caller is host of event (defence-in-depth on top of RLS)
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("host_id")
      .eq("id", photo.event_id)
      .single();
    if (evErr) throw new Error(evErr.message);

    const { data: membership } = await supabaseAdmin
      .from("host_members")
      .select("role")
      .eq("host_id", ev.host_id)
      .eq("user_id", userId)
      .eq("role", "host")
      .maybeSingle();
    if (!membership) throw new Error("Not authorized");

    // Download from private bucket via admin
    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("gallery-uploads")
      .download(photo.storage_path);
    if (dlErr || !file) throw new Error(dlErr?.message ?? "Download failed");

    const filename = photo.storage_path.split("/").pop() ?? `${photo.id}.bin`;
    const publicPath = `${photo.event_id}/${filename}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("gallery-public")
      .upload(publicPath, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (upErr) throw new Error(upErr.message);

    const { data: pub } = supabaseAdmin.storage.from("gallery-public").getPublicUrl(publicPath);

    const { error: updErr } = await supabaseAdmin
      .from("gallery_photos")
      .update({
        status: "approved",
        public_path: publicPath,
        url: pub.publicUrl,
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
      .eq("id", photo.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, url: pub.publicUrl };
  });

const RejectInput = z.object({ photoId: z.string().uuid() });

export const rejectGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejectInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("gallery_photos")
      .update({ status: "rejected" })
      .eq("id", data.photoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
