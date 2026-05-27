import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [{ title: "Sign in — Gather" }] }),
  validateSearch: searchSchema,
  component: SignIn,
});

function safeRedirect(value: string | undefined): string {
  if (!value) return "/";
  // only allow internal paths
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

function SignIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectTo = safeRedirect(search.redirect);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: redirectTo });
  }, [user, navigate, redirectTo]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirectTo}`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Check your inbox to confirm your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${redirectTo}`,
    });
    if (res.error) toast.error(res.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-10">
      <Link to="/" className="mb-8 text-sm text-muted-foreground hover:text-foreground">← Back to Explore</Link>
      <h1 className="font-display text-4xl">{mode === "signin" ? "Welcome back" : "Join Gather"}</h1>
      <p className="mt-2 text-muted-foreground">
        {mode === "signin" ? "Sign in to RSVP and host events." : "Create an account in seconds."}
      </p>

      <Button onClick={handleGoogle} variant="outline" className="mt-8 w-full">
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
        {mode === "signup" && (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
