import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ImageUpload } from "@/components/ImageUpload";
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
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Stable folder for logo upload before the host row exists.
  const [draftFolder] = useState(() => `drafts/${crypto.randomUUID()}`);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const finalSlug = slug || slugify(name);
    const { data, error } = await supabase
      .from("hosts")
      .insert({
        name,
        slug: finalSlug,
        description: bio || null,
        contact_email: contactEmail || null,
        avatar_url: avatarUrl,
        created_by: user.id,
      })
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
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <Label>Logo</Label>
            <ImageUpload
              bucket="host-logos"
              folder={draftFolder}
              currentUrl={avatarUrl}
              label="Upload logo"
              onUploaded={({ publicUrl }) => setAvatarUrl(publicUrl)}
            />
          </div>

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
            <Label htmlFor="bio">Short bio</Label>
            <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people who you are and what you organize." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Contact email</Label>
            <Input id="email" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@yourhost.com" />
            <p className="text-xs text-muted-foreground">Shown on your public host page so attendees can reach you.</p>
          </div>

          <Button type="submit" disabled={busy || !name || !slug || !contactEmail}>{busy ? "Creating…" : "Create host"}</Button>
        </form>
      </Card>
    </div>
  );
}
