import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hosts/new")({
  head: () => ({ meta: [{ title: "Create Host — Gather" }] }),
  component: NewHost,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function NewHost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const finalSlug = slug || slugify(name);
    const { data, error } = await supabase
      .from("hosts")
      .insert({ name, slug: finalSlug, description: description || null, created_by: user.id })
      .select("slug")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Host created");
    navigate({ to: "/h/$hostSlug", params: { hostSlug: data.slug } });
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="font-display text-4xl">Create a host</h1>
      <p className="mt-2 text-muted-foreground">Hosts are the organizations or people running events.</p>

      <Card className="mt-8 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="my-host" />
            <p className="text-xs text-muted-foreground">Your public page will be /h/{slug || "your-slug"}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy || !name || !slug}>{busy ? "Creating…" : "Create host"}</Button>
        </form>
      </Card>
    </div>
  );
}
