import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { ExternalLink, Bookmark, Check, Crown, Lock } from "lucide-react";
import { toast } from "sonner";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { toolQuery } from "@/lib/tools";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  getToolTiers,
  formatTierPrice,
  getUnlockedToolSlugs,
  type MonetizationTier,
} from "@/lib/monetization";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createToolCheckout } from "@/utils/payments.functions";

export const Route = createFileRoute("/tools/$slug")({
  loader: async ({ context, params }) => {
    const tool = await context.queryClient.ensureQueryData(toolQuery(params.slug));
    if (!tool) throw notFound();
    return { name: tool.name, tagline: tool.tagline };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Studio Labs` },
          { name: "description", content: loaderData.tagline },
          { property: "og:title", content: `${loaderData.name} — Studio Labs` },
          { property: "og:description", content: loaderData.tagline },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Unavailable — Studio Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: ToolPage,
});

function ToolCheckoutModal({
  toolName,
  toolSlug,
  tier,
  onClose,
}: {
  toolName: string;
  toolSlug: string;
  tier: MonetizationTier;
  onClose: () => void;
}) {
  const create = useServerFn(createToolCheckout);
  const fetchClientSecret = useCallback(async () => {
    const billingModel =
      tier.billingModel === "free" ? "one_time" : tier.billingModel;
    const r = await create({
      data: {
        toolSlug,
        toolName,
        tierName: tier.tierName,
        priceCents: tier.priceCents,
        billingModel,
        ...(tier.stripePriceId && { stripePriceId: tier.stripePriceId }),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in r) throw new Error(r.error);
    if (!r.clientSecret) throw new Error("Checkout could not start");
    return r.clientSecret;
  }, [create, toolName, toolSlug, tier]);

  return (
    <div className="my-6 rounded-2xl border border-primary/40 bg-card p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg font-bold">
          Unlock {toolName} — {tier.tierName} ({formatTierPrice(tier.priceCents, tier.billingModel)})
        </p>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl bg-background">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

function ToolPage() {
  const { slug } = Route.useParams();
  const { data: tool } = useSuspenseQuery(toolQuery(slug));
  const { user, isPremium } = useSession();
  const [saving, setSaving] = useState(false);
  const [activeCheckoutTier, setActiveCheckoutTier] = useState<MonetizationTier | null>(null);

  if (!tool) return null;

  const tiers = getToolTiers(slug);
  const hasFreeTier = tiers.length === 0 || tiers.some((t) => t.billingModel === "free" || t.priceCents === 0);
  const unlockedLocally = getUnlockedToolSlugs().includes(slug);
  const canAccessLiveApp = hasFreeTier || isPremium || unlockedLocally;

  async function save() {
    if (!user || !tool) return;
    setSaving(true);
    const { error } = await supabase
      .from("saved_items")
      .insert({ user_id: user.id, tool_id: tool.id, title: tool.name, url: tool.url });
    setSaving(false);
    error ? toast.error("Couldn't save") : toast.success("Saved to your profile");
  }

  function handleTierAction(tier: MonetizationTier) {
    if (tier.billingModel === "free" || tier.priceCents === 0) {
      window.open(tool!.url, "_blank", "noreferrer");
      return;
    }
    if (!user) {
      toast.info("Please sign in first to unlock this tier");
      return;
    }
    setActiveCheckoutTier(tier);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-6 py-8">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{tool.tag}</span>
          <h1 className="font-display text-5xl font-bold tracking-tight">{tool.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{tool.description || tool.tagline}</p>
        </div>
        <div className="flex gap-2">
          {user && isPremium && (
            <Button variant="outline" onClick={save} disabled={saving}>
              <Bookmark className="mr-1 h-4 w-4" />Save
            </Button>
          )}
          {user && !isPremium && (
            <Button variant="outline" asChild>
              <Link to="/profile">Upgrade to save</Link>
            </Button>
          )}
          {canAccessLiveApp && (
            <Button asChild>
              <a href={tool.url} target="_blank" rel="noreferrer">
                Open as its own app <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pb-12">
        {activeCheckoutTier && (
          <ToolCheckoutModal
            toolName={tool.name}
            toolSlug={tool.slug}
            tier={activeCheckoutTier}
            onClose={() => setActiveCheckoutTier(null)}
          />
        )}

        {!canAccessLiveApp ? (
          <div className="flex h-[42vh] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center">
            <Lock className="h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-bold">Pro Access Required</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Choose an access tier below to unlock {tool.name} and launch the full online app.
            </p>
          </div>
        ) : tool.embeddable ? (
          <iframe
            src={tool.url}
            title={tool.name}
            className="h-[75vh] w-full glass rounded-2xl bg-card"
            allow="clipboard-write; microphone; camera"
          />
        ) : (
          <div className="flex h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed border-foreground/25 text-center">
            <p className="text-muted-foreground">This tool runs best in its own window.</p>
            <Button className="mt-4" asChild>
              <a href={tool.url} target="_blank" rel="noreferrer">Launch {tool.name}</a>
            </Button>
          </div>
        )}

        {canAccessLiveApp && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Demo not loading? Use "Open as its own app".
          </p>
        )}

        {/* Monetization Tiers Section */}
        {tiers.length > 0 && (
          <section className="mt-10 border-t border-border/40 pt-8">
            <div className="mb-5">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Access & Licensing
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold">Available Tiers for {tool.name}</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`flex flex-col justify-between rounded-2xl border p-6 ${
                    tier.highlighted
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border/70 glass"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        {tier.accessLevel}
                      </span>
                      {tier.highlighted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary-foreground">
                          <Crown className="h-3 w-3" /> Popular
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-bold">{tier.tierName}</h3>
                    <p className="mt-1 font-display text-3xl font-bold text-primary">
                      {formatTierPrice(tier.priceCents, tier.billingModel)}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {tier.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6">
                    {tier.billingModel === "free" || tier.priceCents === 0 ? (
                      <Button variant="outline" className="w-full" asChild>
                        <a href={tool.url} target="_blank" rel="noreferrer">
                          {tier.ctaLabel || "Launch Free"}
                        </a>
                      </Button>
                    ) : !user ? (
                      <Button className="w-full" asChild>
                        <Link to="/auth">Sign in to {tier.ctaLabel || "Unlock"}</Link>
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => handleTierAction(tier)}>
                        {tier.ctaLabel || `Unlock ${formatTierPrice(tier.priceCents, tier.billingModel)}`}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
