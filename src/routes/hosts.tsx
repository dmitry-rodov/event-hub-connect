import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/hosts")({
  head: () => ({
    meta: [
      { title: "Hosts — Gather" },
      { name: "description", content: "Browse hosts on Gather and discover their events." },
      { property: "og:title", content: "Hosts — Gather" },
      { property: "og:description", content: "Browse hosts on Gather and discover their events." },
    ],
  }),
  component: HostsList,
});

function HostsList() {
  const [q, setQ] = useState("");
  const { data: hosts, isLoading } = useQuery({
    queryKey: ["hosts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hosts")
        .select("id, slug, name, description, avatar_url, banner_url")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (hosts ?? []).filter((h) =>
    q.trim() === "" ||
    h.name.toLowerCase().includes(q.toLowerCase()) ||
    (h.description ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-5xl">Hosts</h1>
          <p className="mt-2 text-muted-foreground">Discover the people and communities behind the events.</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search hosts" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No hosts found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => (
            <Link key={h.id} to="/h/$hostSlug" params={{ hostSlug: h.slug }}>
              <Card className="group h-full overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative h-24 bg-gradient-to-br from-accent via-secondary to-primary/20">
                  {h.banner_url && <img src={h.banner_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex gap-3 p-4">
                  <div className="-mt-10 h-14 w-14 shrink-0 overflow-hidden rounded-xl border-4 border-background bg-muted">
                    {h.avatar_url && <img src={h.avatar_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg">{h.name}</div>
                    {h.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
