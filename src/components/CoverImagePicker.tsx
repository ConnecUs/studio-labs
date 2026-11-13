import { useState, useRef } from "react";
import {
  CURATED_COVER_GALLERY,
  getDefaultCoverForTool,
  resolveCoverUrl,
} from "@/lib/coverGallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Check,
  X,
  Layers,
} from "lucide-react";
import { notify } from "@/lib/notificationLog";
import { queryLocalModel } from "@/lib/modelHubRouter";
import { getCeoCode } from "@/components/CeoCodeGate";

interface CoverImagePickerProps {
  coverUrl: string;
  onChange: (url: string) => void;
  toolName?: string;
  toolTag?: string;
  ollamaOnline?: boolean;
  selectedModel?: string;
}

async function compressImageDataUrl(dataUrl: string, maxWidth = 1280, quality = 0.85): Promise<string> {
  if (dataUrl.length < 250_000 || typeof document === "undefined") return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function CoverImagePicker({
  coverUrl,
  onChange,
  toolName = "",
  toolTag = "",
  ollamaOnline = false,
  selectedModel = "character-designer:latest",
}: CoverImagePickerProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [aiGenerating, setAiGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedCoverUrl = resolveCoverUrl(coverUrl);
  const activeDisplayUrl =
    normalizedCoverUrl || getDefaultCoverForTool({ name: toolName, tag: toolTag });

  const categories = [
    "All",
    "25th Dynasty Vault",
    "Kush Novels",
    "Visual Novels",
    "Studio & Sound",
    "Cyber & Neural",
  ];

  const filteredItems =
    selectedCategory === "All"
      ? CURATED_COVER_GALLERY
      : CURATED_COVER_GALLERY.filter((item) => item.category === selectedCategory);

  // Handle local image file upload -> upload to VPS or compress to base64 DataURL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify.error("Please upload a valid image file (.png, .jpg, .webp)", "cover");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify.error("File is larger than 5MB. Please choose an optimized image.", "cover");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const dataUrl = await compressImageDataUrl(rawDataUrl);

      const ceoCode = getCeoCode();
      if (ceoCode) {
        try {
          const res = await fetch("/api/studio-labs/upload-cover", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CEO-Code": ceoCode,
            },
            body: JSON.stringify({ filename: file.name, dataUrl }),
          });
          if (res.ok) {
            const json = (await res.json()) as { url?: string };
            if (json.url) {
              onChange(json.url);
              notify.success(`Uploaded "${file.name}" to KushNovels.com!`, "cover");
              return;
            }
          }
        } catch {
          // Fallback to inline compressed DataURL for local dev
        }
      }

      onChange(dataUrl);
      notify.success(`Loaded "${file.name}" as cover image!`, "cover");
    };
    reader.readAsDataURL(file);
  };

  // AI Cover Concept Generator via Local Ollama
  const generateCoverPromptWithAI = async () => {
    if (!ollamaOnline) {
      notify.warning("Local Ollama (:11434) is offline — start Ollama locally to generate AI cover ideas.", "ollama");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await queryLocalModel({
        model: selectedModel,
        prompt: `Create a cinematic visual cover art description for this online tool:
Tool Name: "${toolName || "Kush Online Studio"}"
Tag/Category: "${toolTag || "Creative Studio"}"

Give a 1-sentence prompt description of what the cover art should look like in the 25th Dynasty aesthetic (ancient-future Nubian gold, cyber neon, holographic hieroglyphs).`,
      });
      notify.info(`AI Concept (${res.modelUsed}): ${res.response.trim()}`, "ollama");
    } catch {
      notify.error("Local model not reachable for cover suggestion", "ollama");
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="h-4 w-4 text-primary" /> Cover Image & Art
        </Label>
        <span className="text-[11px] font-mono text-muted-foreground">
          {coverUrl ? "Custom Cover Set" : "Using Smart Fallback"}
        </span>
      </div>

      {/* Visual Live Card Preview */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-muted/60 shadow-sm">
        <img
          src={activeDisplayUrl}
          alt="Cover Preview"
          className="h-full w-full object-cover transition-transform hover:scale-105 duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-white backdrop-blur">
              {toolTag || "Online Tool"}
            </span>
            {coverUrl && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="rounded-full bg-black/60 p-1 text-white hover:bg-destructive transition-colors"
                title="Reset to default smart cover"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white drop-shadow">
              {toolName || "Tool Title Preview"}
            </p>
            <p className="text-[10px] text-white/80 line-clamp-1 drop-shadow">
              {coverUrl ? coverUrl : "Using vault smart cover (never blank)"}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons: Browse Gallery | Upload | AI Suggest */}
      <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowGallery(!showGallery)}
          className="gap-1.5 text-xs border-primary/50 text-primary hover:bg-primary/10"
        >
          <Layers className="h-3.5 w-3.5" />
          {showGallery ? "Close Gallery" : "Browse Vault Gallery"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-1.5 text-xs hover:bg-muted"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload File
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={aiGenerating || !ollamaOnline}
          title={ollamaOnline ? "Generate cover concept via local Ollama" : "Local Ollama (:11434) offline"}
          onClick={generateCoverPromptWithAI}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground col-span-2 sm:col-span-1"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Cover Idea
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Manual URL Input */}
      <div>
        <Input
          type="text"
          placeholder="Or paste image URL (https://... or /studio-labs/covers/...)"
          value={coverUrl}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs font-mono h-8"
        />
      </div>

      {/* Embedded Visual Gallery Grid (when expanded) */}
      {showGallery && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-background/80 p-3 shadow-inner">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="font-mono text-xs font-bold text-foreground">
              Select from Sovereign Vault & VPS Gallery
            </span>
            <span className="text-[11px] text-muted-foreground">Click to select</span>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded px-2 py-0.5 text-[10px] font-mono transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Image Cards Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 sm:grid-cols-3">
            {filteredItems.map((item) => {
              const isSelected = normalizedCoverUrl === resolveCoverUrl(item.url);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.url);
                    notify.success(`Selected cover "${item.title}"`, "cover");
                  }}
                  className={`group relative aspect-[16/10] overflow-hidden rounded-md border text-left transition-all ${
                    isSelected
                      ? "ring-2 ring-primary border-primary shadow"
                      : "border-border/60 hover:border-primary/60"
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5">
                    <p className="text-[10px] font-bold text-white truncate drop-shadow">
                      {item.title}
                    </p>
                    <p className="text-[9px] text-white/70 truncate">{item.authorOrSource}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
