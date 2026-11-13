/**
 * Per-Tool Monetization Tiers & Pricing Registry
 * Allows configuring Free, Freemium, One-Time, and Subscription tiers for any injected online tool.
 */

export type BillingModel = "free" | "one_time" | "monthly" | "yearly";
export type AccessLevel = "free" | "freemium" | "pro" | "enterprise";

export interface MonetizationTier {
  id: string;
  toolKey: string; // matches tool.slug
  tierName: string;
  accessLevel: AccessLevel;
  billingModel: BillingModel;
  priceCents: number;
  currency: string;
  stripePriceId: string;
  features: string[];
  highlighted: boolean;
  ctaLabel: string;
}

const TIERS_STORAGE_KEY = "kush_tools_monetization_tiers_v1";
const UNLOCKED_STORAGE_KEY = "kush_tools_unlocked_slugs_v1";

/**
 * Default tiers for flagship injected tools (used until customized in Admin)
 */
export const DEFAULT_TOOL_TIERS: Record<string, MonetizationTier[]> = {
  "kush-novels": [
    {
      id: "tier-kn-free",
      toolKey: "kush-novels",
      tierName: "Reader Pass",
      accessLevel: "free",
      billingModel: "free",
      priceCents: 0,
      currency: "usd",
      stripePriceId: "",
      features: ["Read featured chapters", "Stream preview soundscapes", "Browse lore codex"],
      highlighted: false,
      ctaLabel: "Launch Free",
    },
    {
      id: "tier-kn-pro",
      toolKey: "kush-novels",
      tierName: "Dynasty Patron",
      accessLevel: "pro",
      billingModel: "monthly",
      priceCents: 1200,
      currency: "usd",
      stripePriceId: "",
      features: ["Full audiobook & novel archive", "Lossless soundtrack downloads", "Early chapter drops"],
      highlighted: true,
      ctaLabel: "Subscribe $12/mo",
    },
  ],
  "kush-viz-engine": [
    {
      id: "tier-kve-free",
      toolKey: "kush-viz-engine",
      tierName: "Sandbox Preview",
      accessLevel: "freemium",
      billingModel: "free",
      priceCents: 0,
      currency: "usd",
      stripePriceId: "",
      features: ["Test scene storyboarder", "Preview 3 visual novel scenes", "Standard export"],
      highlighted: false,
      ctaLabel: "Try Free",
    },
    {
      id: "tier-kve-pro",
      toolKey: "kush-viz-engine",
      tierName: "Creator Studio",
      accessLevel: "pro",
      billingModel: "monthly",
      priceCents: 2900,
      currency: "usd",
      stripePriceId: "",
      features: ["Unlimited Ren'Py script exports", "HD character & background generation", "Commercial rights"],
      highlighted: true,
      ctaLabel: "Unlock Studio $29/mo",
    },
  ],
};

export const TIER_PRESET_BUNDLES: Array<{
  id: string;
  label: string;
  description: string;
  build: (toolKey: string) => MonetizationTier[];
}> = [
  {
    id: "free-only",
    label: "100% Free / Open",
    description: "No paywall — open access for all visitors",
    build: (toolKey) => [
      {
        id: `${toolKey}-free-${Date.now()}`,
        toolKey,
        tierName: "Open Access",
        accessLevel: "free",
        billingModel: "free",
        priceCents: 0,
        currency: "usd",
        stripePriceId: "",
        features: ["Full live app access", "No account required"],
        highlighted: false,
        ctaLabel: "Launch Free",
      },
    ],
  },
  {
    id: "freemium-pro",
    label: "Freemium + Pro ($19/mo)",
    description: "Free preview tier + $19/mo Pro subscription",
    build: (toolKey) => [
      {
        id: `${toolKey}-free-${Date.now()}`,
        toolKey,
        tierName: "Starter Preview",
        accessLevel: "freemium",
        billingModel: "free",
        priceCents: 0,
        currency: "usd",
        stripePriceId: "",
        features: ["Live interactive preview", "Basic exports", "Community access"],
        highlighted: false,
        ctaLabel: "Try Free",
      },
      {
        id: `${toolKey}-pro-${Date.now() + 1}`,
        toolKey,
        tierName: "Creator Pro",
        accessLevel: "pro",
        billingModel: "monthly",
        priceCents: 1900,
        currency: "usd",
        stripePriceId: "",
        features: ["Unlimited projects & exports", "Priority rendering", "Commercial license"],
        highlighted: true,
        ctaLabel: "Upgrade — $19/mo",
      },
    ],
  },
  {
    id: "one-time-unlock",
    label: "Lifetime Unlock ($29)",
    description: "Single one-time payment to unlock forever",
    build: (toolKey) => [
      {
        id: `${toolKey}-onetime-${Date.now()}`,
        toolKey,
        tierName: "Lifetime License",
        accessLevel: "pro",
        billingModel: "one_time",
        priceCents: 2900,
        currency: "usd",
        stripePriceId: "",
        features: ["One-time payment, lifetime access", "All future updates included", "Direct app launch"],
        highlighted: true,
        ctaLabel: "Unlock Lifetime — $29",
      },
    ],
  },
  {
    id: "saas-multi",
    label: "Pro ($19/mo) + Empire ($49/mo)",
    description: "Dual paid tiers for creators & studios",
    build: (toolKey) => [
      {
        id: `${toolKey}-pro-${Date.now()}`,
        toolKey,
        tierName: "Pro Creator",
        accessLevel: "pro",
        billingModel: "monthly",
        priceCents: 1900,
        currency: "usd",
        stripePriceId: "",
        features: ["Full tool access", "Cloud project saves", "Standard support"],
        highlighted: false,
        ctaLabel: "Start Pro — $19/mo",
      },
      {
        id: `${toolKey}-ent-${Date.now() + 1}`,
        toolKey,
        tierName: "Dynasty Studio",
        accessLevel: "enterprise",
        billingModel: "monthly",
        priceCents: 4900,
        currency: "usd",
        stripePriceId: "",
        features: ["Everything in Pro", "Team seats & API access", "White-label commercial rights"],
        highlighted: true,
        ctaLabel: "Go Studio — $49/mo",
      },
    ],
  },
];

export function getAllMonetizationConfigs(): Record<string, MonetizationTier[]> {
  if (typeof window === "undefined") return { ...DEFAULT_TOOL_TIERS };
  try {
    const raw = localStorage.getItem(TIERS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TOOL_TIERS };
    const parsed = JSON.parse(raw) as Record<string, MonetizationTier[]>;
    return { ...DEFAULT_TOOL_TIERS, ...parsed };
  } catch {
    return { ...DEFAULT_TOOL_TIERS };
  }
}

export function getToolTiers(toolKey: string): MonetizationTier[] {
  if (!toolKey) return [];
  const all = getAllMonetizationConfigs();
  return all[toolKey] ?? [];
}

export function saveToolTiers(toolKey: string, tiers: MonetizationTier[]): void {
  if (typeof window === "undefined" || !toolKey) return;
  try {
    const raw = localStorage.getItem(TIERS_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, MonetizationTier[]>) : {};
    existing[toolKey] = tiers.map((t) => ({ ...t, toolKey }));
    localStorage.setItem(TIERS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error("Failed to save monetization tiers:", err);
  }
}

export function formatTierPrice(priceCents: number, billingModel: BillingModel): string {
  if (billingModel === "free" || priceCents <= 0) return "Free";
  const dollars = (priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2);
  switch (billingModel) {
    case "monthly":
      return `$${dollars}/mo`;
    case "yearly":
      return `$${dollars}/yr`;
    case "one_time":
    default:
      return `$${dollars}`;
  }
}

export function getToolBadgeSummary(toolKey: string): {
  label: string;
  isPaid: boolean;
  isFreemium: boolean;
} {
  const tiers = getToolTiers(toolKey);
  if (tiers.length === 0) {
    return { label: "FREE", isPaid: false, isFreemium: false };
  }
  const hasFree = tiers.some((t) => t.billingModel === "free" || t.priceCents === 0);
  const paidTiers = tiers
    .filter((t) => t.billingModel !== "free" && t.priceCents > 0)
    .sort((a, b) => a.priceCents - b.priceCents);

  if (paidTiers.length === 0) {
    return { label: "FREE", isPaid: false, isFreemium: false };
  }
  const lowestPaid = paidTiers[0]!;
  const priceText = formatTierPrice(lowestPaid.priceCents, lowestPaid.billingModel);
  if (hasFree) {
    return { label: `FREEMIUM · PRO ${priceText}`, isPaid: true, isFreemium: true };
  }
  return { label: `PRO · ${priceText}`, isPaid: true, isFreemium: false };
}

export function getUnlockedToolSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(UNLOCKED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markToolUnlocked(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  const current = new Set(getUnlockedToolSlugs());
  current.add(slug);
  localStorage.setItem(UNLOCKED_STORAGE_KEY, JSON.stringify(Array.from(current)));
}

export function exportMonetizationConfigJson(): string {
  return JSON.stringify(getAllMonetizationConfigs(), null, 2);
}

export function importMonetizationConfigJson(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as Record<string, MonetizationTier[]>;
    if (typeof parsed !== "object" || parsed === null) return false;
    localStorage.setItem(TIERS_STORAGE_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}
