import { queryOptions } from "@tanstack/react-query";
import { sovereignToolsDb } from "@/lib/sovereignDb";

export interface Tool {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  cover_url: string | null;
  tag: string;
  embeddable: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
}

const LOCAL_STORAGE_KEY = "kush_tools_catalog_override";
const BASE_PREFIX = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

// Fallback catalog reflecting official online tools (Kushnovels.com, 25th-dynasty.com, and Lovable published tools)
export const ONLINE_TOOLS_FALLBACK: Tool[] = [
  {
    id: "20e6d0a0-8758-419e-b23b-65493e352f65",
    slug: "kush-novels",
    name: "Kush Novels LLC",
    tagline: "Historical storytelling, music, and creative tools.",
    description:
      "Explore Kush Novels LLC: The Lost Archer Chronicles, hip-hop soundscapes, creator software, and browser games.",
    url: "https://kush-novel-nook.lovable.app/",
    cover_url: `${BASE_PREFIX}/covers/Cover.png`,
    tag: "Creative Suite",
    embeddable: true,
    published: true,
    sort_order: 0,
    created_at: "2026-11-11T18:16:57.548689+00:00",
  },
  {
    id: "7c2b7a15-2c76-45b2-b31c-bab992b0e22c",
    slug: "kush-viz-engine",
    name: "Kush Viz Engine",
    tagline: "Turn playthroughs into editable visual novels.",
    description:
      "Transform recorded sessions, transcripts, and lyrics into visual novel scenes with art, audio, branching dialogue, and editable Ren'Py scripts.",
    url: "https://kush-viz-engine.lovable.app/",
    cover_url: `${BASE_PREFIX}/covers/Napata_Vision.png`,
    tag: "Visual Novels",
    embeddable: true,
    published: true,
    sort_order: 1,
    created_at: "2026-11-11T22:47:21.429792+00:00",
  },
  {
    id: "64de45c6-fded-48a2-9273-28d59664fdd2",
    slug: "storyforge",
    name: "StoryForge",
    tagline: "Your old let's-plays are unwritten novels",
    description:
      "StoryForge listens to a recorded session, cuts it into scenes, generates the art and score, and hands you an editable Ren'Py script — dialogue, branches and all.",
    url: "https://storyweaver-storyforge.lovable.app/",
    cover_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    tag: "Experiment",
    embeddable: true,
    published: true,
    sort_order: 2,
    created_at: "2026-11-12T20:10:58.478378+00:00",
  },
  {
    id: "9f3b8b3d-5c3a-4b4e-9e1a-lyricstudio01",
    slug: "lyric-studio",
    name: "Lyric Studio",
    tagline: "Zero-API Songwriting & DSP Audio Rack",
    description:
      "Interactive DAW for lyricists and MCs with real-time rhyme scheme clustering, syllable cadence tracking, and modular visual DSP signal routing.",
    url: "https://kushnovels.com/lyrical-studio",
    cover_url: `${BASE_PREFIX}/covers/kush_login_bg.jpg`,
    tag: "Studio & Sound",
    embeddable: true,
    published: true,
    sort_order: 3,
    created_at: "2026-11-13T05:00:00+00:00",
  },
];

export function getLocalStoredTools(): Tool[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalStoredTools(tools: Tool[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tools));
  } catch (err) {
    console.error("Failed to save local tools:", err);
  }
  void sovereignToolsDb.saveAll(tools);
}

export function clearLocalStoredTools(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  void sovereignToolsDb.clear();
}

export async function saveRemoteTools(tools: Tool[], ceoCode: string): Promise<boolean> {
  if (typeof window === "undefined" || !ceoCode) return false;
  try {
    const res = await fetch("/api/studio-labs/tools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CEO-Code": ceoCode,
      },
      body: JSON.stringify({ tools }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const toolsQuery = queryOptions({
  queryKey: ["tools"],
  staleTime: 0,
  queryFn: async (): Promise<Tool[]> => {
    // 1. Try live VPS catalog endpoint first when in browser
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/studio-labs/tools", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as { tools?: Tool[] };
          if (Array.isArray(json.tools) && json.tools.length > 0) {
            const sorted = [...json.tools].sort((a, b) => a.sort_order - b.sort_order);
            saveLocalStoredTools(sorted);
            return sorted;
          }
        }
      } catch {
        // fallback to browser IndexedDB / localStorage
      }
    }

    // 2. Browser IndexedDB
    const idbTools = await sovereignToolsDb.list();
    if (idbTools && idbTools.length > 0) {
      return [...idbTools].sort((a, b) => a.sort_order - b.sort_order);
    }

    // 3. localStorage fallback
    const localOverrides = getLocalStoredTools();
    if (localOverrides.length > 0) {
      return [...localOverrides].sort((a, b) => a.sort_order - b.sort_order);
    }

    return [...ONLINE_TOOLS_FALLBACK];
  },
});

export const toolQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tool", slug],
    staleTime: 0,
    queryFn: async (): Promise<Tool | null> => {
      if (typeof window !== "undefined") {
        try {
          const res = await fetch("/api/studio-labs/tools", { cache: "no-store" });
          if (res.ok) {
            const json = (await res.json()) as { tools?: Tool[] };
            const match = json.tools?.find((t) => t.slug === slug);
            if (match) return match;
          }
        } catch {
          // fallback
        }
      }

      const idbTools = await sovereignToolsDb.list();
      const idbMatch = idbTools?.find((t) => t.slug === slug);
      if (idbMatch) return idbMatch;

      const localOverrides = getLocalStoredTools();
      const localMatch = localOverrides.find((t) => t.slug === slug);
      if (localMatch) return localMatch;

      return ONLINE_TOOLS_FALLBACK.find((t) => t.slug === slug) ?? null;
    },
  });
