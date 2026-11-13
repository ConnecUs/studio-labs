import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { notify } from "@/lib/notificationLog";
import { NotificationTerminal } from "@/components/NotificationTerminal";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Trash2,
  Sparkles,
  RefreshCw,
  Globe,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/use-session";
import {
  toolsQuery,
  type Tool,
  saveLocalStoredToolsAsync,
  clearLocalStoredTools,
  saveRemoteTools,
} from "@/lib/tools";
import {
  checkModelHubStatus,
  queryLocalModel,
  type ModelHubHealth,
} from "@/lib/modelHubRouter";
import { CoverImagePicker } from "@/components/CoverImagePicker";
import { coverPath, getDefaultCoverForTool, resolveCoverUrl } from "@/lib/coverGallery";
import { MonetizationTierEditor } from "@/components/MonetizationTierEditor";
import {
  type MonetizationTier,
  getToolTiers,
  saveToolTiers,
  getToolBadgeSummary,
  exportMonetizationConfigJson,
} from "@/lib/monetization";
import { Download, Rocket, Lock } from "lucide-react";
import { CeoCodeGate, getCeoCode, lockCeoSession } from "@/components/CeoCodeGate";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Studio Labs & Online Tools Hub" },
      { name: "description", content: "Manage and edit online tools from Kushnovels.com, 25th-dynasty.com, and Lovable." },
      { property: "og:title", content: "Admin — Studio Labs & Online Tools Hub" },
      { property: "og:description", content: "Manage and edit online tools from Kushnovels.com, 25th-dynasty.com, and Lovable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <CeoCodeGate>
      <Admin />
    </CeoCodeGate>
  ),
});

const empty = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  url: "",
  cover_url: "",
  tag: "Online Tool",
  embeddable: true,
  published: true,
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const PRESET_ONLINE_TOOLS = [
  {
    name: "Kush Novels Portal",
    url: "https://kushnovels.com",
    tagline: "The central home of The Lost Archer Chronicles & sovereign literature.",
    description: "Official online portal for Kush Novels LLC: stories, lore, music and web experiments.",
    tag: "Literature",
    cover_url: coverPath("Cover.png"),
  },
  {
    name: "25th Dynasty Empire",
    url: "https://25th-dynasty.com",
    tagline: "Ancient-future African creative renaissance & multimedia empire.",
    description: "Flagship home of 25th Dynasty productions, visual arts, and digital ecosystem.",
    tag: "Ecosystem",
    cover_url: coverPath("Cover2.png"),
  },
  {
    name: "CEO Missions Portal",
    url: "https://kushnovels.com/ceo/missions",
    tagline: "Autonomous executive operations & task orchestration command.",
    description: "Online missions portal coordinating autonomous company objectives and roadmaps.",
    tag: "Executive",
    cover_url: coverPath("BookCover1.png"),
  },
  {
    name: "Kush Viz Engine",
    url: "https://kush-viz-engine.lovable.app/",
    tagline: "Turn playthroughs and gameplay transcripts into editable visual novels.",
    description: "Transform recorded sessions and lyrics into visual novel scenes with art, audio, branching dialogue, and Ren'Py exports.",
    tag: "Visual Novels",
    cover_url: coverPath("Napata_Vision.png"),
  },
  {
    name: "StoryForge",
    url: "https://storyweaver-storyforge.lovable.app/",
    tagline: "Your old let's-plays are unwritten novels",
    description: "StoryForge listens to a recorded session, cuts it into scenes, generates the art and score, and hands you an editable Ren'Py script.",
    tag: "Narrative AI",
    cover_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
  },
];

function Admin() {
  const { isAdmin, ready, user } = useSession();
  const qc = useQueryClient();
  const tools = useQuery(toolsQuery);
  const [form, setForm] = useState(empty);
  const [formTiers, setFormTiers] = useState<MonetizationTier[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  // Model Manager Hub state
  const [modelHealth, setModelHealth] = useState<ModelHubHealth | null>(null);
  const [probingModel, setProbingModel] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("qwen2.5-coder:14b");
  const [generatingWithAI, setGeneratingWithAI] = useState(false);

  const probeModelHub = useCallback(async () => {
    setProbingModel(true);
    try {
      const h = await checkModelHubStatus();
      setModelHealth(h);
      if (h.ollama.models.length > 0) {
        const preferred =
          h.ollama.models.find((m) => m.includes("coder") || m.includes("kush") || m.includes("gemma")) ||
          h.ollama.models[0];
        if (preferred) setSelectedModel(preferred);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProbingModel(false);
    }
  }, []);

  useEffect(() => {
    void probeModelHub();
  }, [probeModelHub]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["tools"] });
    await qc.invalidateQueries({ queryKey: ["tool"] });
    await qc.refetchQueries({ queryKey: ["tools"] });
  };

  // AI-Assisted Metadata Generation using Local Model Managers
  async function generateWithLocalModel() {
    if (!form.name && !form.url) {
      notify.error("Please enter a Tool Name or URL first", "ollama");
      return;
    }

    setGeneratingWithAI(true);
    try {
      const prompt = `You are the lead product copywriter for Kush Novels and 25th Dynasty creative studios.
Tool Name: "${form.name || "Kush Online Tool"}"
Tool URL: "${form.url || "https://kushnovels.com"}"
Existing Tagline: "${form.tagline}"

Generate compelling metadata for this online tool. Respond ONLY with valid JSON in this exact structure:
{
  "tagline": "A punchy, captivating one-line tagline (max 10 words)",
  "description": "An exciting 1-2 sentence description explaining the tool's capabilities",
  "tag": "Category (e.g. Visual Novels, Literature, Soundscapes, AI Creative, Ecosystem)",
  "slug": "kebab-case-slug"
}`;

      const res = await queryLocalModel({
        model: selectedModel,
        prompt,
        temperature: 0.3,
        systemPrompt: "You are an assistant that exclusively outputs valid JSON with no markdown wrapping.",
      });

      // Parse JSON from response
      const jsonMatch = res.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setForm((prev) => ({
          ...prev,
          tagline: parsed.tagline || prev.tagline,
          description: parsed.description || prev.description,
          tag: parsed.tag || prev.tag,
          slug: parsed.slug || prev.slug || slugify(prev.name),
        }));
        notify.success(`Generated copy with ${res.modelUsed}`, "ollama");
      } else {
        notify.info("Generated text received, please check fields.", "ollama");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(`Local model generation failed: ${msg}`, "ollama");
    } finally {
      setGeneratingWithAI(false);
    }
  }

  async function persistCatalogChange(
    currentList: Tool[],
    successRemoteMsg: string,
    localFallbackMsg: string,
    updatedSlug?: string
  ) {
    await saveLocalStoredToolsAsync(currentList);
    qc.setQueryData(["tools"], currentList);
    if (updatedSlug) {
      const match = currentList.find((t) => t.slug === updatedSlug) ?? null;
      qc.setQueryData(["tool", updatedSlug], match);
    }

    const remoteResult = await saveRemoteTools(currentList, getCeoCode());
    if (remoteResult.ok) {
      notify.success(successRemoteMsg, "catalog");
      await refresh();
    } else {
      notify.warning(
        `${localFallbackMsg} (Remote sync skipped: ${remoteResult.error || "unavailable"})`,
        "sync"
      );
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      slug: form.slug || slugify(form.name),
      cover_url: form.cover_url || null,
    };

    const currentList = tools.data ? [...tools.data] : [];
    if (editing) {
      const idx = currentList.findIndex((t) => t.id === editing);
      if (idx !== -1) {
        currentList[idx] = {
          ...currentList[idx],
          ...payload,
        } as Tool;
      }
    } else {
      const newTool: Tool = {
        ...payload,
        id: crypto.randomUUID(),
        sort_order: currentList.length,
        created_at: new Date().toISOString(),
      };
      currentList.push(newTool);
    }

    saveToolTiers(payload.slug, formTiers);
    await persistCatalogChange(
      currentList,
      editing
        ? `Updated "${payload.name}" & monetization tiers live on KushNovels.com`
        : `Published "${payload.name}" & monetization tiers live to KushNovels.com`,
      editing
        ? `Saved "${payload.name}" & monetization tiers in browser IndexedDB`
        : `Added "${payload.name}" & monetization tiers to browser IndexedDB`,
      payload.slug
    );

    setForm(empty);
    setFormTiers([]);
    setEditing(null);
  }

  function edit(t: Tool) {
    setEditing(t.id);
    setForm({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      url: t.url,
      cover_url: t.cover_url ?? "",
      tag: t.tag,
      embeddable: t.embeddable,
      published: t.published,
    });
    setFormTiers(getToolTiers(t.slug));
    notify.info(`Loaded "${t.name}" into editor`, "catalog");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function del(t: Tool) {
    if (!confirm(`Delete ${t.name}?`)) return;

    const currentList = (tools.data ?? []).filter((item) => item.id !== t.id);
    await persistCatalogChange(
      currentList,
      `Deleted "${t.name}" from live catalog`,
      `Deleted "${t.name}" from browser IndexedDB`
    );
  }

  async function toggle(t: Tool) {
    const updatedPublished = !t.published;
    const currentList = (tools.data ?? []).map((item) =>
      item.id === t.id ? { ...item, published: updatedPublished } : item
    );
    await persistCatalogChange(
      currentList,
      `${t.name} is now ${updatedPublished ? "Visible" : "Hidden"} live`,
      `${t.name} set to ${updatedPublished ? "Visible" : "Hidden"} locally`,
      t.slug
    );
  }

  async function move(i: number, dir: -1 | 1) {
    const list = tools.data ? [...tools.data] : [];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;

    const temp = list[i]!;
    list[i] = list[j]!;
    list[j] = temp;

    list.forEach((item, index) => {
      item.sort_order = index;
    });

    await persistCatalogChange(
      list,
      `Reordered "${temp.name}" live`,
      `Reordered "${temp.name}" locally`
    );
  }

  function applyPreset(p: typeof PRESET_ONLINE_TOOLS[0]) {
    setForm((prev) => ({
      ...prev,
      name: p.name,
      url: p.url,
      tagline: p.tagline,
      description: p.description,
      tag: p.tag,
      slug: slugify(p.name),
      cover_url: p.cover_url || getDefaultCoverForTool({ name: p.name, tag: p.tag }),
    }));
    notify.info(`Loaded preset: ${p.name}`, "catalog");
  }

  function handleResetDatabase() {
    if (confirm("Reset local catalog overrides and pull freshly from online database?")) {
      clearLocalStoredTools();
      void refresh();
      notify.success("Reset to online database tools.", "sync");
    }
  }

  const set = (k: keyof typeof empty) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen pb-16">
      <SiteHeader />

      {/* Admin Title & Quick Preset Strip */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-6 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Online Tools & Catalog Admin
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage online tools offered from Kushnovels.com, 25th-dynasty.com, and Lovable published apps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleResetDatabase} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Reset Database View
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
              <Link to="/">
                <Globe className="h-3.5 w-3.5" /> View Public Hub
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                lockCeoSession();
                window.location.reload();
              }}
              className="gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Lock className="h-3.5 w-3.5" /> Lock Portal
            </Button>
          </div>
        </div>

        {/* Quick Presets for Kushnovels & 25th Dynasty */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase text-muted-foreground mr-1">Quick Presets:</span>
          {PRESET_ONLINE_TOOLS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs text-foreground hover:border-primary hover:bg-primary/10 transition-colors"
            >
              + {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Session Notification Terminal */}
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <NotificationTerminal />
      </div>

      {/* Main Form & Management Grid */}
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-[440px_1fr]">
        {/* Tool Edit/Add Form with Local Model AI Assistant */}
        <form onSubmit={submit} className="space-y-4 glass rounded-2xl p-6 border border-border/60">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h2 className="font-display text-xl font-bold">
              {editing ? "Edit Tool Entry" : "Add New Online Tool"}
            </h2>
            {editing && (
              <span className="font-mono text-xs text-primary font-semibold">Editing active</span>
            )}
          </div>

          <div>
            <Label>Tool / App Name</Label>
            <Input
              required
              placeholder="e.g. Kush Novels Portal, Kush Viz Engine"
              value={form.name}
              onChange={set("name")}
            />
          </div>

          <div>
            <Label>App URL (Online Web App)</Label>
            <Input
              required
              type="url"
              placeholder="https://kushnovels.com or https://app.lovable.app"
              value={form.url}
              onChange={set("url")}
            />
          </div>

          {/* Local Model Manager Generator Bar */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Local Model Copywriter
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    modelHealth?.ollama.online
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-500/15 text-muted-foreground border border-border"
                  }`}
                >
                  {modelHealth?.ollama.online
                    ? `Online (${modelHealth.ollama.models.length})`
                    : "Offline"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={selectedModel}
                  disabled={!modelHealth?.ollama.online}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-mono disabled:opacity-50"
                >
                  {modelHealth?.ollama.models && modelHealth.ollama.models.length > 0 ? (
                    modelHealth.ollama.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))
                  ) : (
                    <option value="qwen2.5-coder:14b">qwen2.5-coder:14b</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => void probeModelHub()}
                  disabled={probingModel}
                  title="Re-check local Ollama (:11434)"
                  className="rounded border border-border bg-background p-1 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`h-3 w-3 ${probingModel ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Uses local Ollama (:11434) to auto-generate tagline, description, tag and slug.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generatingWithAI || !modelHealth?.ollama.online}
              onClick={generateWithLocalModel}
              className="w-full gap-2 text-xs border-primary/40 hover:bg-primary/10"
            >
              {generatingWithAI ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating with Local Model...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  ✨ Auto-Fill Copy with {selectedModel.split(":")[0]}
                </>
              )}
            </Button>
          </div>

          <div>
            <Label>Tagline</Label>
            <Input
              placeholder="Crisp 1-line summary"
              value={form.tagline}
              onChange={set("tagline")}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              placeholder="Detailed description of features and capabilities"
              value={form.description}
              onChange={set("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category Tag</Label>
              <Input
                placeholder="e.g. Visual Novels, Literature"
                value={form.tag}
                onChange={set("tag")}
              />
            </div>
            <div>
              <Label>Page Slug</Label>
              <Input placeholder="auto" value={form.slug} onChange={set("slug")} />
            </div>
          </div>

          {/* Visual Cover Image Picker with Gallery, Upload & AI concept */}
          <CoverImagePicker
            coverUrl={form.cover_url}
            onChange={(url) => setForm((prev) => ({ ...prev, cover_url: url }))}
            toolName={form.name}
            toolTag={form.tag}
            ollamaOnline={Boolean(modelHealth?.ollama.online)}
            selectedModel={selectedModel}
          />

          {/* Per-Tool Monetization & Pricing Tiers */}
          <MonetizationTierEditor
            toolKey={form.slug || slugify(form.name)}
            toolName={form.name}
            toolTagline={form.tagline}
            tiers={formTiers}
            onChange={setFormTiers}
            selectedModel={selectedModel}
            ollamaOnline={Boolean(modelHealth?.ollama.online)}
          />

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label className="cursor-pointer">Embed in Studio Labs Hub</Label>
              <p className="text-[11px] text-muted-foreground">Renders live in interactive iframe</p>
            </div>
            <Switch
              checked={form.embeddable}
              onCheckedChange={(v) => setForm({ ...form, embeddable: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="cursor-pointer">Visible in Public Directory</Label>
              <p className="text-[11px] text-muted-foreground">Show in main experiments grid</p>
            </div>
            <Switch
              checked={form.published}
              onCheckedChange={(v) => setForm({ ...form, published: v })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1 font-semibold">
              {editing ? "Save Changes" : "Add Online Tool"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setForm(empty);
                  setFormTiers([]);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        {/* Existing Tools Catalog List */}
        <div>
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Active Catalog · {tools.data?.length ?? 0} Online Tools
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground">
              Drag or use arrows to sort
            </span>
          </div>

          <ul className="mt-4 divide-y divide-foreground/10 glass rounded-2xl border border-border/60 overflow-hidden">
            {tools.data?.map((t, i) => (
              <li
                key={t.id}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex flex-col text-muted-foreground">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="p-1 hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === (tools.data?.length ?? 0) - 1}
                    className="p-1 hover:text-foreground disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted relative">
                  <img
                    src={resolveCoverUrl(t.cover_url) || getDefaultCoverForTool(t)}
                    alt={t.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getDefaultCoverForTool(t);
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-foreground">{t.name}</span>
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {t.tag}
                    </span>
                    {(() => {
                      const badge = getToolBadgeSummary(t.slug);
                      return (
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                            badge.isPaid
                              ? "bg-primary/15 text-primary border border-primary/30"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                    {!t.published && (
                      <span className="rounded bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] text-destructive">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{t.tagline}</p>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                  >
                    {t.url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={t.published}
                    onCheckedChange={() => toggle(t)}
                    aria-label="Toggle visible"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => edit(t)}
                    aria-label="Edit tool"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => del(t)}
                    aria-label="Delete tool"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {/* Online Deployment & Export Readiness Panel */}
          <div className="mt-8 rounded-2xl border border-primary/30 bg-card/60 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                  <Rocket className="h-5 w-5 text-primary" />
                  Ready to Push Online (Websites)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Export your catalog + monetization tiers and deploy to Cloudflare Workers, Vercel, or your VPS.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => {
                  const bundle = {
                    exportedAt: new Date().toISOString(),
                    tools: tools.data ?? [],
                    monetizationTiers: JSON.parse(exportMonetizationConfigJson()),
                  };
                  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "kush-tools-publish-bundle.json";
                  a.click();
                  URL.revokeObjectURL(url);
                  notify.success("Downloaded kush-tools-publish-bundle.json", "export");
                }}
              >
                <Download className="h-3.5 w-3.5" /> Export Publish Bundle (.json)
              </Button>
            </div>

            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">Supabase Target</span>
                <p className="mt-1 font-mono font-semibold truncate">
                  {import.meta.env["VITE_SUPABASE_PROJECT_ID"] || "uyoayxbuzfducqqimqnt"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">Stripe Checkout</span>
                <p className="mt-1 font-mono font-semibold">
                  {(import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined)?.startsWith("pk_live_")
                    ? "Live Production (pk_live_)"
                    : "Sandbox Test Mode (pk_test_)"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">Deploy Command</span>
                <p className="mt-1 font-mono font-semibold text-primary">bun run deploy:cf</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
