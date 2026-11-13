import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { sovereignAuth } from "@/lib/sovereignDb";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { isCeoUnlocked } from "@/components/CeoCodeGate";

export function SiteHeader() {
  const { user } = useSession();
  const ceoUnlocked = isCeoUnlocked();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await sovereignAuth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="glass sticky top-0 z-20 border-x-0 border-t-0 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="inline-block h-3 w-3 rounded-full bg-primary" /> Studio Labs
        </Link>
        <nav className="flex items-center gap-3 font-mono text-xs uppercase tracking-wider">
          <a
            href="/"
            className="hidden px-2 py-1 text-muted-foreground hover:text-foreground md:inline-block"
          >
            Main Portal
          </a>
          <a
            href="/ceo/missions"
            className="hidden px-2 py-1 text-muted-foreground hover:text-foreground md:inline-block"
          >
            CEO Missions
          </a>
          <a
            href="https://25th-dynasty.com"
            target="_blank"
            rel="noreferrer"
            className="hidden px-2 py-1 text-muted-foreground hover:text-foreground lg:inline-block"
          >
            25th-Dynasty.com
          </a>
          {ceoUnlocked && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/20 transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
          {user ? (
            <>
              <Link to="/profile" className="px-3 py-2 hover:text-primary">Profile</Link>
              <Button size="sm" variant="outline" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <Button size="sm" asChild><Link to="/auth">Sign in</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}
