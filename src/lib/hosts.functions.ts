import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AcceptInput = z.object({ token: z.string().min(8).max(128) });

export const acceptHostInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AcceptInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: invite, error } = await supabaseAdmin
      .from("host_invites")
      .select("id, host_id, role, expires_at, used_at, hosts:hosts(slug, name)")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.used_at) throw new Error("Invite already used");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

    // Insert membership (unique constraint prevents dupes)
    const { error: insErr } = await supabaseAdmin
      .from("host_members")
      .insert({ host_id: invite.host_id, user_id: userId, role: invite.role });
    if (insErr && !insErr.message.includes("duplicate")) {
      throw new Error(insErr.message);
    }

    await supabaseAdmin
      .from("host_invites")
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq("id", invite.id);

    const host = Array.isArray(invite.hosts) ? invite.hosts[0] : invite.hosts;
    return { hostSlug: host?.slug ?? null, hostName: host?.name ?? null, role: invite.role };
  });
