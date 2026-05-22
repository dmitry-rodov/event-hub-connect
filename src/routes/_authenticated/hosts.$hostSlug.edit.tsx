import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ImageUpload } from "@/components/ImageUpload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hosts/$hostSlug/edit")({
  head: () => ({ meta: [{ title: "Edit Host — Gather" }] }),
  component: EditHost,
});

function EditHost() {
  const { hostSlug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState<"host" | "checker">("checker");
  const [creating, setCreating] = useState(false);

  const { data: host, isLoading } = useQuery({
    queryKey: ["host", hostSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from("hosts").select("*").eq("slug", hostSlug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["host-members", host?.id],
    enabled: !!host?.id,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("host_members")
        .select("id, user_id, role")
        .eq("host_id", host!.id);
      const list = rows ?? [];
      const ids = list.map((r) => r.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, display_name").in("id", ids)
        : { data: [] as Array<{ id: string; display_name: string | null }> };
      const map = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
      return list.map((r) => ({ ...r, display_name: map.get(r.user_id) ?? null }));
    },
  });


  const { data: invites } = useQuery({
    queryKey: ["host-invites", host?.id],
    enabled: !!host?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("host_invites")
        .select("id, token, role, expires_at, used_at, created_at")
        .eq("host_id", host!.id)
        .is("used_at", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function createInvite() {
    if (!user || !host) return;
    setCreating(true);
    const { error } = await supabase
      .from("host_invites")
      .insert({ host_id: host.id, role: role as any, created_by: user.id });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite link created");
    qc.invalidateQueries({ queryKey: ["host-invites", host.id] });
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.from("host_invites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["host-invites", host?.id] });
  }

  function copyInvite(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Invite link copied"),
      () => toast.error("Could not copy"),
    );
  }

  if (isLoading) return <div className="mx-auto max-w-2xl px-6 py-12"><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  if (!host) return <div className="mx-auto max-w-2xl px-6 py-12">Host not found.</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/h/$hostSlug" params={{ hostSlug }} className="text-sm text-muted-foreground hover:text-foreground">← Back to host page</Link>
      <h1 className="mt-4 font-display text-4xl">{host.name}</h1>
      <p className="mt-2 text-muted-foreground">Manage your host page, team, and invite links.</p>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-xl">Logo</h2>
        <p className="mb-4 text-sm text-muted-foreground">Upload a square logo. Visible on your host page.</p>
        <ImageUpload
          bucket="host-logos"
          folder={host.id}
          currentUrl={host.avatar_url}
          label="Upload logo"
          onUploaded={async ({ publicUrl }) => {
            if (!user) { navigate({ to: "/signin" }); return; }
            const { error } = await supabase.from("hosts").update({ avatar_url: publicUrl }).eq("id", host.id);
            if (error) { toast.error(error.message); return; }
            qc.invalidateQueries({ queryKey: ["host", hostSlug] });
          }}
        />
      </Card>

      <ProfileCard host={host} onSaved={() => qc.invalidateQueries({ queryKey: ["host", hostSlug] })} />

      <Card className="mt-6 p-6">
        <h2 className="font-display text-xl">Team</h2>
        <p className="mb-4 text-sm text-muted-foreground">Hosts can edit events. Checkers can run the check-in page only.</p>
        <ul className="space-y-2">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>{m.display_name ?? m.user_id.slice(0, 8)}</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs capitalize text-accent-foreground">{m.role}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-lg border bg-muted/30 p-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Invite a new member</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as "host" | "checker")}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="host">Host (full access)</SelectItem>
                <SelectItem value="checker">Checker (check-in only)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={createInvite} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              Create invite link
            </Button>
          </div>
        </div>

        {invites && invites.length > 0 && (
          <div className="mt-4 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Active invite links</Label>
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div className="min-w-0">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs capitalize text-accent-foreground">{inv.role}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {`${window.location.origin}/invite/${inv.token}`.slice(0, 60)}…
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    expires {new Date(inv.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => copyInvite(inv.token)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => revokeInvite(inv.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ProfileCard({ host, onSaved }: { host: any; onSaved: () => void }) {
  const [name, setName] = useState<string>(host.name ?? "");
  const [description, setDescription] = useState<string>(host.description ?? "");
  const [contactEmail, setContactEmail] = useState<string>(host.contact_email ?? "");
  const [website, setWebsite] = useState<string>(host.website ?? "");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("hosts")
      .update({
        name,
        description: description || null,
        contact_email: contactEmail || null,
        website: website || null,
      })
      .eq("id", host.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    onSaved();
  }

  return (
    <Card className="mt-6 p-6">
      <h2 className="font-display text-xl">Profile</h2>
      <p className="mb-4 text-sm text-muted-foreground">Public details shown on your host page.</p>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="h-name">Name</Label>
          <Input id="h-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-bio">Short bio</Label>
          <Textarea id="h-bio" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-email">Contact email</Label>
          <Input id="h-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@yourhost.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-web">Website</Label>
          <Input id="h-web" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </div>
        <Button type="submit" disabled={busy || !name}>{busy ? "Saving…" : "Save profile"}</Button>
      </form>
    </Card>
  );
}
