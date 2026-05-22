import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Calendar, Ticket, LayoutDashboard, LogOut } from "lucide-react";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Calendar className="h-4 w-4" />
          </span>
          <span className="font-display text-xl">Gather</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/" activeOptions={{ exact: true }} className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Explore
          </Link>
          {user && (
            <>
              <Link to="/tickets" className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                My Tickets
              </Link>
              <Link to="/my-events" className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                My Events
              </Link>
              <Link to="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                Host Dashboard
              </Link>
              <Link to="/reports" className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                Reports
              </Link>

            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/hosts/new">Become a host</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/signin" search={{ redirect: "/hosts/new" } as never}>Become a host</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signin">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        <TabLink to="/" icon={<Calendar className="h-5 w-5" />} label="Explore" exact />
        <TabLink to="/tickets" icon={<Ticket className="h-5 w-5" />} label="Tickets" />
        <TabLink to="/my-events" icon={<Calendar className="h-5 w-5" />} label="Events" />
        <TabLink to="/dashboard" icon={<LayoutDashboard className="h-5 w-5" />} label="Host" />
      </div>
    </nav>
  );
}

function TabLink({ to, icon, label, exact }: { to: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      {label}
    </Link>
  );
}
