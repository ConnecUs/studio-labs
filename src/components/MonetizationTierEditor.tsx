import { useState } from "react";
import {
  type MonetizationTier,
  type BillingModel,
  type AccessLevel,
  TIER_PRESET_BUNDLES,
  formatTierPrice,
} from "@/lib/monetization";
import { queryLocalModel } from "@/lib/modelHubRouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

interface MonetizationTierEditorProps {
  toolKey: string;
  toolName: string;
  toolTagline: string;
  tiers: MonetizationTier[];
  onChange: (tiers: MonetizationTier[]) => void;
  selectedModel?: string;
  ollamaOnline?: boolean;
}

export function MonetizationTierEditor({
  toolKey,
  toolName,
  toolTagline,
  tiers,
  onChange,
  selectedModel = "qwen2.5-coder:14b",
  ollamaOnline = false,
}: MonetizationTierEditorProps) {
  const [aiDesigning, setAiDesigning] = useState(false);

  const addBlankTier = () => {
    const newTier: MonetizationTier = {
      id: `tier-${Date.now()}`,
      toolKey: toolKey || "new-tool",
      tierName: tiers.length === 0 ? "Free Access" : "Creator Pro",
      accessLevel: tiers.length === 0 ? "free" : "pro",
      billingModel: tiers.length === 0 ? "free" : "monthly",
      priceCents: tiers.length === 0 ? 0 : 1900,
      currency: "usd",
      stripePriceId: "",
      features: tiers.length === 0 ? ["Live preview access"] : ["Full tool access", "Unlimited exports"],
      highlighted: tiers.length > 0,
      ctaLabel: tiers.length === 0 ? "Launch Free" : "Upgrade — $19/mo",
    };
    onChange([...tiers, newTier]);
  };

  const updateTier = (id: string, patch: Partial<MonetizationTier>) => {
    onChange(
      tiers.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...patch };
        if (patch.billingModel === "free") {
          updated.priceCents = 0;
        }
        return updated;
      })
    );
  };

  const removeTier = (id: string) => {
    onChange(tiers.filter((t) => t.id !== id));
  };

  const applyBundle = (bundleId: string) => {
    const bundle = TIER_PRESET_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    onChange(bundle.build(toolKey || "tool"));
    toast.success(`Applied "${bundle.label}" monetization tiers`);
  };

  const designTiersWithAI = async () => {
    if (!toolName) {
      toast.error("Enter a Tool Name first so the local model can design tiers");
      return;
    }
    setAiDesigning(true);
    try {
      const prompt = `Design 2 monetization tiers (one Free/Freemium tier and one Pro paid tier) for this online creative tool:
Tool Name: "${toolName}"
Tagline: "${toolTagline || "Online creative software"}"

Respond ONLY with a valid JSON array of 2 objects matching this exact schema:
[
  {
    "tierName": "Starter Preview",
    "accessLevel": "freemium",
    "billingModel": "free",
    "priceCents": 0,
    "features": ["Feature 1", "Feature 2"],
    "highlighted": false,
    "ctaLabel": "Try Free"
  },
  {
    "tierName": "Creator Pro",
    "accessLevel": "pro",
    "billingModel": "monthly",
    "priceCents": 1900,
    "features": ["Feature 1", "Feature 2", "Feature 3"],
    "highlighted": true,
    "ctaLabel": "Unlock Pro — $19/mo"
  }
]`;

      const res = await queryLocalModel({
        model: selectedModel,
        prompt,
        temperature: 0.3,
        systemPrompt: "Return ONLY a valid JSON array. No markdown fences or extra commentary.",
      });

      const match = res.response.match(/\[[\s\S]*\]/);
      if (!match) {
        toast.error("Could not parse tier JSON from local model");
        return;
      }
      const parsed = JSON.parse(match[0]) as Array<Partial<MonetizationTier>>;
      const built: MonetizationTier[] = parsed.map((item, idx) => ({
        id: `ai-tier-${Date.now()}-${idx}`,
        toolKey: toolKey || "tool",
        tierName: item.tierName || (idx === 0 ? "Free" : "Pro"),
        accessLevel: (item.accessLevel as AccessLevel) || (idx === 0 ? "freemium" : "pro"),
        billingModel: (item.billingModel as BillingModel) || (idx === 0 ? "free" : "monthly"),
        priceCents: typeof item.priceCents === "number" ? item.priceCents : idx === 0 ? 0 : 1900,
        currency: "usd",
        stripePriceId: "",
        features: Array.isArray(item.features) ? item.features : ["Full access"],
        highlighted: Boolean(item.highlighted),
        ctaLabel: item.ctaLabel || (idx === 0 ? "Launch Free" : "Unlock Pro"),
      }));
      onChange(built);
      toast.success(`Designed ${built.length} monetization tiers via ${res.modelUsed}`);
    } catch (err: unknown) {
      toast.error(`AI tier design failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAiDesigning(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <DollarSign className="h-4 w-4 text-primary" /> Monetization Tiers ({tiers.length})
        </Label>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={aiDesigning || !ollamaOnline}
            onClick={designTiersWithAI}
            className="h-7 gap-1 text-[11px] border-primary/40 text-primary hover:bg-primary/10"
          >
            {aiDesigning ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI Design Tiers
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBlankTier}
            className="h-7 gap-1 text-[11px]"
          >
            <Plus className="h-3 w-3" /> Add Tier
          </Button>
        </div>
      </div>

      {/* Quick Tier Preset Bundles */}
      <div className="flex flex-wrap gap-1.5">
        {TIER_PRESET_BUNDLES.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => applyBundle(b.id)}
            title={b.description}
            className="rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-[10px] font-mono text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Configured Tiers List */}
      {tiers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
          No custom tiers configured — defaults to <strong>Free Open Access</strong>. Pick a preset above or click <strong>Add Tier</strong>.
        </p>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier, idx) => (
            <div
              key={tier.id}
              className={`rounded-lg border p-3 space-y-2.5 ${
                tier.highlighted
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 bg-background/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Crown
                    className={`h-3.5 w-3.5 ${
                      tier.highlighted ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="font-mono text-xs font-bold">
                    Tier {idx + 1} · {formatTierPrice(tier.priceCents, tier.billingModel)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground cursor-pointer">
                    <Switch
                      checked={tier.highlighted}
                      onCheckedChange={(v) => updateTier(tier.id, { highlighted: v })}
                    />
                    Featured
                  </label>
                  <button
                    type="button"
                    onClick={() => removeTier(tier.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    title="Remove tier"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Tier Name</Label>
                  <Input
                    value={tier.tierName}
                    onChange={(e) => updateTier(tier.id, { tierName: e.target.value })}
                    placeholder="Creator Pro"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Access Level</Label>
                  <select
                    value={tier.accessLevel}
                    onChange={(e) =>
                      updateTier(tier.id, { accessLevel: e.target.value as AccessLevel })
                    }
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="free">Free</option>
                    <option value="freemium">Freemium</option>
                    <option value="pro">Pro (Paid)</option>
                    <option value="enterprise">Enterprise / Studio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Billing</Label>
                  <select
                    value={tier.billingModel}
                    onChange={(e) =>
                      updateTier(tier.id, { billingModel: e.target.value as BillingModel })
                    }
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="free">Free ($0)</option>
                    <option value="one_time">One-Time</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px]">Price (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    disabled={tier.billingModel === "free"}
                    value={Math.round(tier.priceCents / 100)}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        priceCents: Math.max(0, Number(e.target.value || 0)) * 100,
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">CTA Button</Label>
                  <Input
                    value={tier.ctaLabel}
                    onChange={(e) => updateTier(tier.id, { ctaLabel: e.target.value })}
                    placeholder="Unlock Pro"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px]">Features (comma-separated)</Label>
                  <Input
                    value={tier.features.join(", ")}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        features: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Unlimited exports, HD art, Commercial license"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Stripe Price ID (optional)</Label>
                  <Input
                    value={tier.stripePriceId}
                    onChange={(e) => updateTier(tier.id, { stripePriceId: e.target.value })}
                    placeholder="price_... (or auto dynamic)"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
