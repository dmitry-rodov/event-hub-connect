import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Users, UserPlus, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Host Dashboard — Gather" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["my-hosts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_members")
        .select("role, host:hosts(id, slug, name, avatar_url, description)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Host Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Manage the hosts you belong to.</p>
        </div>
        <Button asChild>
          <Link to="/hosts/new"><Plus className="mr-2 h-4 w-4" /> New Host</Link>
        </Button>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted md:col-span-2" />
        ) : memberships && memberships.length > 0 ? (
          memberships.map((m, i) => m.host && (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl">{m.host.name}</h3>
                  {m.host.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{m.host.description}</p>}
                  <div className="mt-3 inline-flex rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground capitalize">
                    {m.role}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/h/$hostSlug" params={{ hostSlug: m.host.slug }}>View page</Link>
                </Button>
                {m.role === "host" && (
                  <InviteDialog hostId={m.host.id} hostName={m.host.name} />
                )}
                <Button variant="ghost" size="sm" disabled><Users className="mr-2 h-4 w-4" />Members</Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground md:col-span-2">
            You're not a member of any host yet.
            <div className="mt-4">
              <Button asChild size="sm"><Link to="/hosts/new">Create your first host</Link></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InviteDialog({ hostId, hostName }: { hostId: string; hostName: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"host" | "checker">("checker");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: invites } = useQuery({
    queryKey: ["invites", hostId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_invites")
        .select("id, role, token, expires_at, used_at, created_at")
        .eq("host_id", hostId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function generate() {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("host_invites")
      .insert({ host_id: hostId, role, created_by: user.id })
      .select("token")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const url = `${window.location.origin}/invite/${data.token}`;
    setLink(url);
    qc.invalidateQueries({ queryKey: ["invites", hostId] });
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><UserPlus className="mr-2 h-4 w-4" />Invite</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {hostName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "host" | "checker")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checker">Checker — can scan tickets</SelectItem>
                <SelectItem value="host">Host — full access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {link && (
            <div className="space-y-2">
              <Label>Invite link</Label>
              <div className="flex gap-2">
                <Input readOnly value={link} />
                <Button type="button" size="icon" variant="outline" onClick={() => copy(link)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Valid for 14 days. Single use.</p>
            </div>
          )}

          {invites && invites.length > 0 && (
            <div className="space-y-1 border-t pt-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Recent invites</Label>
              <ul className="space-y-1 text-sm">
                {invites.map((inv) => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.token}`;
                  return (
                    <li key={inv.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-muted-foreground">
                        {inv.role} · {inv.used_at ? "used" : new Date(inv.expires_at) < new Date() ? "expired" : "active"}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => copy(url)} disabled={!!inv.used_at}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate new link"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
