/**
 * 25th Dynasty & Kush Novels Sovereign Cover Gallery
 * Provides curated cover art from the media vault, VPS endpoints, and cloud CDN
 */

const BASE_PREFIX = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
export const coverPath = (file: string) => `${BASE_PREFIX}/covers/${file.replace(/^\/?(covers\/)?/, "")}`;

/**
 * Normalizes stored cover URLs across local ("/") and published ("/studio-labs/") base paths.
 */
export function resolveCoverUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^\/(?:studio-labs\/)?covers\/(.+)$/i);
  if (match && match[1]) {
    return `${BASE_PREFIX}/covers/${match[1]}`;
  }
  return trimmed;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: "25th Dynasty Vault" | "Kush Novels" | "Visual Novels" | "Studio & Sound" | "Cyber & Neural";
  url: string;
  authorOrSource: string;
}

export const CURATED_COVER_GALLERY: GalleryItem[] = [
  // 25th Dynasty & Kush Novels Vault Art
  {
    id: "cover-gold-emblem",
    title: "25th Dynasty Sovereign Gold",
    category: "25th Dynasty Vault",
    url: coverPath("Cover.png"),
    authorOrSource: "Kush Novels LLC Vault",
  },
  {
    id: "cover-dynasty-chronicles",
    title: "Dynasty Chronicles Edition II",
    category: "25th Dynasty Vault",
    url: coverPath("Cover2.png"),
    authorOrSource: "25th Dynasty Media Vault",
  },
  {
    id: "cover-lost-archer-1",
    title: "The Lost Archer Book I",
    category: "Kush Novels",
    url: coverPath("BookCover1.png"),
    authorOrSource: "The Lost Archer Chronicles",
  },
  {
    id: "cover-lost-archer-special",
    title: "The Lost Archer Master Edition",
    category: "Kush Novels",
    url: coverPath("CoverOne1.png"),
    authorOrSource: "The Lost Archer Chronicles",
  },
  {
    id: "cover-napata-vision",
    title: "Vision of Napata",
    category: "Visual Novels",
    url: coverPath("Napata_Vision.png"),
    authorOrSource: "Kush Viz Engine Storyboard",
  },
  {
    id: "cover-software-lost-archer",
    title: "Lost Archer Game Studio Core",
    category: "Visual Novels",
    url: coverPath("Software_Logo_The_Lost_Archer.jpeg"),
    authorOrSource: "25th Dynasty Interactive",
  },
  {
    id: "cover-kush-neon-dark",
    title: "Kush Cyber Neon Vault",
    category: "Studio & Sound",
    url: coverPath("kush_login_bg.jpg"),
    authorOrSource: "Kush Audio & Production Studio",
  },

  // Online Cloud CDN & Universal VPS Fallbacks (Always accessible anywhere)
  {
    id: "cover-cloud-neural-abstract",
    title: "Neural Nebula Matrix",
    category: "Cyber & Neural",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    authorOrSource: "Cloud CDN",
  },
  {
    id: "cover-cloud-retro-hardware",
    title: "Cyberpunk Workstation & Synth",
    category: "Studio & Sound",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    authorOrSource: "Cloud CDN",
  },
  {
    id: "cover-cloud-sound-desk",
    title: "Master Audio Studio Console",
    category: "Studio & Sound",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
    authorOrSource: "Cloud CDN",
  },
  {
    id: "cover-cloud-prism-geometry",
    title: "3D Quantum Prism Core",
    category: "Cyber & Neural",
    url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80",
    authorOrSource: "Cloud CDN",
  },
  {
    id: "cover-cloud-dark-code",
    title: "Dark Cyber Code Grid",
    category: "Cyber & Neural",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    authorOrSource: "Cloud CDN",
  },
];

/**
 * Returns a high-grade default cover image based on tool attributes so no entry is ever blank
 */
export function getDefaultCoverForTool(tool: {
  slug?: string;
  tag?: string;
  name?: string;
}): string {
  const slug = (tool.slug || "").toLowerCase();
  const tag = (tool.tag || "").toLowerCase();
  const name = (tool.name || "").toLowerCase();

  if (slug.includes("kush-novel") || name.includes("kush novel")) {
    return coverPath("Cover.png");
  }
  if (slug.includes("kush-viz") || name.includes("viz") || tag.includes("visual")) {
    return coverPath("Napata_Vision.png");
  }
  if (slug.includes("story") || name.includes("story") || tag.includes("narrative")) {
    return "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80";
  }
  if (slug.includes("dynasty") || name.includes("dynasty") || tag.includes("empire")) {
    return coverPath("Cover2.png");
  }
  if (tag.includes("music") || tag.includes("sound") || tag.includes("audio")) {
    return coverPath("kush_login_bg.jpg");
  }
  if (tag.includes("neural") || tag.includes("model") || tag.includes("ai")) {
    return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
  }

  // Universal attractive fallback
  return coverPath("CoverOne1.png");
}
