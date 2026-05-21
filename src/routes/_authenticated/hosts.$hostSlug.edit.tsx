import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ImageUpload } from "@/components/ImageUpload";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hosts/$hostSlug/edit")({
  head: () => ({ meta: [{ title: "Edit Host — Gather" }] }),
  component: EditHost,
});

function EditHost() {
  const { hostSlug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: host, isLoading } = useQuery({
    queryKey: ["host", hostSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from("hosts").select("*").eq("slug", hostSlug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-2xl px-6 py-12"><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  if (!host) return <div className="mx-auto max-w-2xl px-6 py-12">Host not found.</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/h/$hostSlug" params={{ hostSlug }} className="text-sm text-muted-foreground hover:text-foreground">← Back to host page</Link>
      <h1 className="mt-4 font-display text-4xl">{host.name}</h1>
      <p className="mt-2 text-muted-foreground">Edit host appearance.</p>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-xl">Logo</h2>
        <p className="mb-4 text-sm text-muted-foreground">Upload a square logo. Visible on your host page.</p>
        <ImageUpload
          bucket="host-logos"
          folder={host.id}
          currentUrl={host.avatar_url}
          label="Upload logo"
          onUploaded={async ({ publicUrl }) => {
            if (!user) return navigate({ to: "/signin" });
            const { error } = await supabase.from("hosts").update({ avatar_url: publicUrl }).eq("id", host.id);
            if (error) return toast.error(error.message);
            qc.invalidateQueries({ queryKey: ["host", hostSlug] });
          }}
        />
      </Card>
    </div>
  );
}
