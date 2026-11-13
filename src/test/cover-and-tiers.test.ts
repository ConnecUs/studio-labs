import { describe, expect, it } from "vitest";
import { resolveCoverUrl } from "@/lib/coverGallery";
import { formatTierPrice } from "@/lib/monetization";
import { saveLocalStoredTools, getLocalStoredTools, type Tool } from "@/lib/tools";

describe("Cover URL resolution & local persistence", () => {
  it("normalizes /studio-labs/covers and /covers paths", () => {
    expect(resolveCoverUrl("/studio-labs/covers/Cover2.png")).toMatch(/\/covers\/Cover2\.png$/);
    expect(resolveCoverUrl("/covers/Napata_Vision.png")).toMatch(/\/covers\/Napata_Vision\.png$/);
    expect(resolveCoverUrl("https://example.com/art.png")).toBe("https://example.com/art.png");
    expect(resolveCoverUrl("")).toBe("");
  });

  it("persists subsequent cover_url updates in localStorage", () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    });

    const initial: Tool[] = [
      {
        id: "t1",
        slug: "storyforge",
        name: "StoryForge",
        tagline: "Tag",
        description: "Desc",
        url: "https://example.com",
        cover_url: "/covers/Cover.png",
        tag: "Experiment",
        embeddable: true,
        published: true,
        sort_order: 0,
        created_at: "2026-11-13T00:00:00Z",
      },
    ];
    saveLocalStoredTools(initial);
    const updated = [{ ...initial[0]!, cover_url: "/covers/Cover2.png" }];
    saveLocalStoredTools(updated);

    const loaded = getLocalStoredTools();
    expect(loaded[0]?.cover_url).toBe("/covers/Cover2.png");
  });
});

describe("Flexible monetization tier formatting", () => {
  it("formats decimal prices, currencies, and custom intervals", () => {
    expect(formatTierPrice(0, "free")).toBe("Free");
    expect(formatTierPrice(499, "monthly", "usd")).toBe("$4.99/mo");
    expect(formatTierPrice(1900, "quarterly", "eur")).toBe("€19/qtr");
    expect(formatTierPrice(9900, "yearly", "gbp")).toBe("£99/yr");
    expect(formatTierPrice(1500, "custom", "usd", "/seat/mo")).toBe("$15 /seat/mo");
  });
});
