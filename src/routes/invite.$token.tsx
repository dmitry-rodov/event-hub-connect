import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptHostInvite } from "@/lib/hosts.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Join Host — Gather" }] }),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const accept = useServerFn(acceptHostInvite);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [result, setResult] = useState<{ hostSlug: string | null; hostName: string | null; role: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/signin", search: { redirect: `/invite/${token}` } as never });
    }
  }, [loading, user, navigate, token]);

  async function handleAccept() {
    setState("working");
    try {
      const r = await accept({ data: { token } });
      setResult(r);
      setState("done");
      toast.success(`Joined ${r.hostName ?? "host"}`);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Failed to accept invite";
      setErrorMsg(m);
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Card className="p-6">
        <h1 className="font-display text-2xl">Join a host</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You've been invited to join a host on Gather.
        </p>

        {state === "done" && result ? (
          <div className="mt-6 space-y-3">
            <p>You joined <strong>{result.hostName}</strong> as <strong>{result.role}</strong>.</p>
            {result.hostSlug && (
              <Button asChild className="w-full">
                <Link to="/h/$hostSlug" params={{ hostSlug: result.hostSlug }}>Open host page</Link>
              </Button>
            )}
          </div>
        ) : state === "error" ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button variant="outline" className="w-full" onClick={() => setState("idle")}>Try again</Button>
          </div>
        ) : (
          <Button onClick={handleAccept} disabled={state === "working" || !user} className="mt-6 w-full">
            {state === "working" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept invite
          </Button>
        )}
      </Card>
    </div>
  );
}
