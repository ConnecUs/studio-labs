import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { toolsQuery } from "@/lib/tools";
import { getDefaultCoverForTool, resolveCoverUrl } from "@/lib/coverGallery";
import { getToolBadgeSummary } from "@/lib/monetization";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio Labs — Try our experimental tools" },
      { name: "description", content: "A hub of experimental apps by Dazyners Studio. Try each tool live, then open it as its own app." },
      { property: "og:title", content: "Studio Labs — Try our experimental tools" },
      { property: "og:description", content: "Try each experimental tool live, then open it as its own app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(toolsQuery),
  component: Index,
});

function Index() {
  const { data: tools } = useSuspenseQuery(toolsQuery);
  const publishedTools = tools.filter((t) => t.published !== false);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Experiments · {publishedTools.length} live</p>
        <h1 className="mt-4 max-w-4xl font-display text-6xl font-bold leading-[0.95] tracking-tight md:text-8xl">
          Tools from the <span className="bg-primary px-2 text-primary-foreground">lab</span>, ready to try.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Play with every experiment right here, then open your favorites as full apps.
        </p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-6 md:grid-cols-2 lg:grid-cols-3">
        {publishedTools.map((t) => {
          const badge = getToolBadgeSummary(t.slug);
          return (
          <Link key={t.id} to="/tools/$slug" params={{ slug: t.slug }} className="glass group flex flex-col rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-primary/50">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-muted">
              <img
                src={resolveCoverUrl(t.cover_url) || getDefaultCoverForTool(t)}
                alt={t.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getDefaultCoverForTool(t);
                }}
              />
              <div className="absolute top-2.5 left-2.5 rounded bg-black/70 backdrop-blur px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                {badge.label}
              </div>
              <div className="absolute top-2.5 right-2.5 rounded bg-black/60 backdrop-blur px-2 py-0.5 font-mono text-[10px] text-white/90">
                {t.tag}
              </div>
            </div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t.tag}</span>
                <h2 className="mt-1 font-display text-2xl font-bold">{t.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            </div>
          </Link>
          );
        })}
      </section>
      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-12 font-mono text-xs text-muted-foreground">
        <span>© Dazyners Studio</span>
        <Link to="/admin" className="hover:text-primary transition-colors">
          Manager Access
        </Link>
      </footer>
    </div>
  );
}
