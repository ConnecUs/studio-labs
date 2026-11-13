import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof s["session_id"] === "string" ? s["session_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Upgrade complete — Studio Labs" },
      { name: "description", content: "Your Studio Labs upgrade status." },
      { property: "og:title", content: "Upgrade complete — Studio Labs" },
      { property: "og:description", content: "Your Studio Labs upgrade status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Return,
});

function Return() {
  const qc = useQueryClient();
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.rpc("is_premium", { _user_id: u.user.id });
      if (data) { setUnlocked(true); qc.invalidateQueries(); clearInterval(t); }
      if (tries > 20) clearInterval(t);
    }, 1500);
    return () => clearInterval(t);
  }, [qc]);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="glass mx-auto mt-20 max-w-md rounded-2xl p-10 text-center">
        {unlocked ? <CheckCircle2 className="mx-auto h-10 w-10 text-primary" /> : <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
        <h1 className="mt-4 font-display text-3xl font-bold">{unlocked ? "You're upgraded!" : "Confirming your payment…"}</h1>
        <p className="mt-2 text-muted-foreground">{unlocked ? "Your profile gallery is unlocked." : "This only takes a few seconds."}</p>
        <Button className="mt-6" asChild><Link to="/profile">Go to my profile</Link></Button>
      </div>
    </div>
  );
}
