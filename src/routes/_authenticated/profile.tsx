import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";
import { sovereignSavedItems } from "@/lib/sovereignDb";
import { toolsQuery } from "@/lib/tools";
import { UpgradeCheckout } from "@/components/upgrade-checkout";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Studio Labs" },
      { name: "description", content: "Your saved projects and links from Studio Labs tools." },
      { property: "og:title", content: "Your profile — Studio Labs" },
      { property: "og:description", content: "Your saved projects and links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user, isPremium } = useSession();
  const qc = useQueryClient();
  const tools = useQuery(toolsQuery);
  const items = useQuery({
    queryKey: ["saved", user?.id],
    enabled: !!user,
    queryFn: async () => (user ? sovereignSavedItems.list(user.id) : []),
  });
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [toolId, setToolId] = useState("");
  const [checkout, setCheckout] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await sovereignSavedItems.add({
      user_id: user.id,
      title,
      url,
      note,
      tool_id: toolId || null,
    });
    setTitle(""); setUrl(""); setNote("");
    qc.invalidateQueries({ queryKey: ["saved"] });
    toast.success("Saved to your browser vault!");
  }
  async function remove(id: string) {
    await sovereignSavedItems.remove(id);
    qc.invalidateQueries({ queryKey: ["saved"] });
  }

  const toolName = (id: string | null) => tools.data?.find((t) => t.id === id)?.name ?? "General";
  const groups = new Map<string, NonNullable<typeof items.data>>();
  (items.data ?? []).forEach((i) => {
    const k = toolName(i.tool_id);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  });

  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{user?.email}</p>
        <h1 className="font-display text-5xl font-bold">Your lab bench</h1>

        {!isPremium ? (
          <div className="mt-10 glass rounded-2xl border-primary/40 bg-primary/20 p-8 text-foreground">
            <Sparkles className="h-6 w-6" />
            <h2 className="mt-3 font-display text-3xl font-bold">Upgrade once, keep everything</h2>
            <p className="mt-2 max-w-lg">A one-time purchase unlocks your personal gallery: save projects and links from every tool.</p>
            {checkout ? <div className="mt-6"><UpgradeCheckout /></div> : <Button className="mt-6" variant="secondary" onClick={() => setCheckout(true)}>Upgrade — $19 one-time</Button>}
          </div>
        ) : (
          <>
            <form onSubmit={add} className="mt-10 grid gap-3 glass rounded-2xl p-5 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <Input placeholder="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="https://… project link" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} />
              <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={toolId} onChange={(e) => setToolId(e.target.value)}>
                <option value="">General</option>
                {tools.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Button>Save</Button>
            </form>
            {groups.size === 0 && <p className="mt-10 text-muted-foreground">Nothing saved yet. <Link to="/" className="underline">Explore the tools</Link>.</p>}
            {[...groups].map(([name, list]) => (
              <section key={name} className="mt-10">
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{name}</h2>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  {list.map((i) => (
                    <div key={i.id} className="glass rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-lg font-bold">{i.title}</h3>
                        <button onClick={() => remove(i.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>
                      </div>
                      {i.note && <p className="mt-1 text-sm text-muted-foreground">{i.note}</p>}
                      <a href={i.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm underline">Open <ExternalLink className="h-3 w-3" /></a>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
