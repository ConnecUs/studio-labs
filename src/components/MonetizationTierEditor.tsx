import { useState } from "react";
import {
  type MonetizationTier,
  type BillingModel,
  TIER_PRESET_BUNDLES,
  formatTierPrice,
} from "@/lib/monetization";
import { queryLocalModel } from "@/lib/modelHubRouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Crown,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";
import { notify } from "@/lib/notificationLog";

interface MonetizationTierEditorProps {
  toolKey: string;
  toolName: string;
  toolTagline: string;
  tiers: MonetizationTier[];
  onChange: (tiers: MonetizationTier[]) => void;
  selectedModel?: string;
  ollamaOnline?: boolean;
}

const ACCESS_LEVEL_SUGGESTIONS = [
  "free",
  "freemium",
  "pro",
  "enterprise",
  "vip",
  "founder",
  "team",
  "beta",
];

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
      id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
      badgeLabel: tiers.length > 0 ? "Popular" : "",
      customBillingLabel: "",
      trialDays: 0,
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

  const duplicateTier = (tier: MonetizationTier) => {
    const copy: MonetizationTier = {
      ...tier,
      id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      tierName: `${tier.tierName} (Copy)`,
      highlighted: false,
      features: [...tier.features],
    };
    onChange([...tiers, copy]);
    notify.info(`Duplicated tier "${tier.tierName}"`, "tiers");
  };

  const moveTier = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= tiers.length) return;
    const next = [...tiers];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    onChange(next);
  };

  const applyBundle = (bundleId: string) => {
    const bundle = TIER_PRESET_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    onChange(bundle.build(toolKey || "tool"));
    notify.success(`Applied "${bundle.label}" monetization tiers`, "tiers");
  };

  const designTiersWithAI = async () => {
    if (!toolName) {
      notify.error("Enter a Tool Name first so the local model can design tiers", "tiers");
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
        notify.error("Could not parse tier JSON from local model", "tiers");
        return;
      }
      const parsed = JSON.parse(match[0]) as Array<Partial<MonetizationTier>>;
      const built: MonetizationTier[] = parsed.map((item, idx) => ({
        id: `ai-tier-${Date.now()}-${idx}`,
        toolKey: toolKey || "tool",
        tierName: item.tierName || (idx === 0 ? "Free" : "Pro"),
        accessLevel: item.accessLevel || (idx === 0 ? "freemium" : "pro"),
        billingModel: (item.billingModel as BillingModel) || (idx === 0 ? "free" : "monthly"),
        priceCents: typeof item.priceCents === "number" ? item.priceCents : idx === 0 ? 0 : 1900,
        currency: item.currency || "usd",
        stripePriceId: "",
        features: Array.isArray(item.features) ? item.features : ["Full access"],
        highlighted: Boolean(item.highlighted),
        ctaLabel: item.ctaLabel || (idx === 0 ? "Launch Free" : "Unlock Pro"),
        badgeLabel: item.highlighted ? "Popular" : "",
      }));
      onChange(built);
      notify.success(`Designed ${built.length} monetization tiers via ${res.modelUsed}`, "tiers");
    } catch (err: unknown) {
      notify.error(`AI tier design failed: ${err instanceof Error ? err.message : String(err)}`, "tiers");
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
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={aiDesigning || !ollamaOnline}
            title={ollamaOnline ? "Design tiers using local Ollama" : "Local Ollama (:11434) offline"}
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
          {tiers.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange([]);
                notify.info("Cleared custom tiers (reverts to Open Access)", "tiers");
              }}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          )}
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

      <datalist id="kush-access-levels">
        {ACCESS_LEVEL_SUGGESTIONS.map((lvl) => (
          <option key={lvl} value={lvl} />
        ))}
      </datalist>

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Crown
                    className={`h-3.5 w-3.5 ${
                      tier.highlighted ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="font-mono text-xs font-bold">
                    Tier {idx + 1} ·{" "}
                    {formatTierPrice(
                      tier.priceCents,
                      tier.billingModel,
                      tier.currency,
                      tier.customBillingLabel
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveTier(idx, -1)}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move tier up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === tiers.length - 1}
                    onClick={() => moveTier(idx, 1)}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move tier down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateTier(tier)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Duplicate tier"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <label className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground cursor-pointer ml-1">
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
                  <Label className="text-[10px]">Access Level (custom or preset)</Label>
                  <Input
                    list="kush-access-levels"
                    value={tier.accessLevel}
                    onChange={(e) => updateTier(tier.id, { accessLevel: e.target.value })}
                    placeholder="pro, freemium, vip..."
                    className="h-8 text-xs"
                  />
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
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px]">Price ({(tier.currency || "usd").toUpperCase()})</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={tier.billingModel === "free"}
                    value={Number((tier.priceCents / 100).toFixed(2))}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        priceCents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)),
                      })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Currency</Label>
                  <select
                    value={(tier.currency || "usd").toLowerCase()}
                    onChange={(e) => updateTier(tier.id, { currency: e.target.value })}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono"
                  >
                    <option value="usd">USD ($)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="gbp">GBP (£)</option>
                    <option value="cad">CAD (CA$)</option>
                    <option value="aud">AUD (A$)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">CTA Button</Label>
                  <Input
                    value={tier.ctaLabel}
                    onChange={(e) => updateTier(tier.id, { ctaLabel: e.target.value })}
                    placeholder="Unlock Pro"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">
                    {tier.billingModel === "custom" ? "Custom Billing Suffix" : "Badge Label / Trial Days"}
                  </Label>
                  {tier.billingModel === "custom" ? (
                    <Input
                      value={tier.customBillingLabel ?? ""}
                      onChange={(e) => updateTier(tier.id, { customBillingLabel: e.target.value })}
                      placeholder="/seat/mo or /1k credits"
                      className="h-8 text-xs"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        value={tier.badgeLabel ?? ""}
                        onChange={(e) => updateTier(tier.id, { badgeLabel: e.target.value })}
                        placeholder="Badge (Popular)"
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={tier.trialDays ?? 0}
                        onChange={(e) =>
                          updateTier(tier.id, {
                            trialDays: Math.max(0, Number(e.target.value || 0)),
                          })
                        }
                        placeholder="Trial days"
                        title="Free trial days (0 = none)"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-[10px]">Features (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={tier.features.join("\n")}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        features: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder={"Unlimited exports\nHD art & audio\nCommercial license"}
                    className="text-xs min-h-[62px]"
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
