/**
 * 25th Dynasty Sovereign Model Management Hub Router
 * Connects Kush Tools directly to local neural engines (Ollama :11434 & Cortex Swarm OS :8000)
 */

export type ProcessTask =
  | "lore_authoring"
  | "character_dialogue"
  | "storyboard_visual_prompt"
  | "lyric_composition"
  | "code_synthesis"
  | "deep_reasoning_qa"
  | "vision_frame_analysis"
  | "semantic_embedding";

export interface ModelProcessConfig {
  task: ProcessTask;
  label: string;
  primary: string;
  fallback: string;
  temperature: number;
  description: string;
}

export const MODEL_HUB_PROCESS_MAP: Record<ProcessTask, ModelProcessConfig> = {
  lore_authoring: {
    task: "lore_authoring",
    label: "Lore & Worldbuilding",
    primary: "kush_author:latest",
    fallback: "lost_archer_1:latest",
    temperature: 0.75,
    description: "25th Dynasty ancient-future lore, narrative chapters, and canon text generation",
  },
  character_dialogue: {
    task: "character_dialogue",
    label: "Character Dialogue & Voice",
    primary: "lost_archer_1:latest",
    fallback: "kush_author:latest",
    temperature: 0.8,
    description: "Kushite character voices, vernacular speech, and interactive dialogue turns",
  },
  storyboard_visual_prompt: {
    task: "storyboard_visual_prompt",
    label: "Visual Prompt Director",
    primary: "character-designer:latest",
    fallback: "gemma4:12b",
    temperature: 0.7,
    description: "Directs master scene prompts for Flux.1, SDXL Forge, and video generators",
  },
  lyric_composition: {
    task: "lyric_composition",
    label: "Lyric & Bar Composition",
    primary: "lyrics-writer:latest",
    fallback: "glimmer:latest",
    temperature: 0.85,
    description: "Rhymes, bars, hooks, and rhythmic song structures",
  },
  code_synthesis: {
    task: "code_synthesis",
    label: "Code & Architecture Synthesis",
    primary: "qwen2.5-coder:14b",
    fallback: "qwen2.5-coder:7b",
    temperature: 0.2,
    description: "Full-stack code generation, refactoring, and schema modeling",
  },
  deep_reasoning_qa: {
    task: "deep_reasoning_qa",
    label: "Deep Architectural Reasoning",
    primary: "deepseek-r1:14b",
    fallback: "phi4:latest",
    temperature: 0.3,
    description: "Autonomous reasoning, verification, and critical plan QA",
  },
  vision_frame_analysis: {
    task: "vision_frame_analysis",
    label: "Vision & Frame QA",
    primary: "qwen3-vl:8b",
    fallback: "llava:13b",
    temperature: 0.2,
    description: "Inspects rendered storyboards, images, and visual assets",
  },
  semantic_embedding: {
    task: "semantic_embedding",
    label: "Semantic Embedding",
    primary: "nomic-embed-text:latest",
    fallback: "tinyllama:latest",
    temperature: 0.0,
    description: "Vector embeddings for semantic search and vault indexing",
  },
};

export interface ModelHubHealth {
  ollama: {
    online: boolean;
    models: string[];
    latencyMs: number;
    error?: string;
  };
  cortex: {
    online: boolean;
    status?: unknown;
    error?: string;
  };
}

const OLLAMA_BASE_CANDIDATES = ["/api/ollama", "http://127.0.0.1:11434"] as const;
const CORTEX_STATUS_CANDIDATES = ["/api/cortex/status", "http://127.0.0.1:8000/status"] as const;

let resolvedOllamaBase: string = OLLAMA_BASE_CANDIDATES[0];

async function fetchJsonIfAvailable<T>(url: string, timeoutMs: number): Promise<T | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Probes the local Ollama daemon and Cortex Swarm OS
 */
export async function checkModelHubStatus(): Promise<ModelHubHealth> {
  const health: ModelHubHealth = {
    ollama: { online: false, models: [], latencyMs: 0 },
    cortex: { online: false },
  };

  // 1. Probe Ollama via Vite proxy or direct localhost (must return real JSON, not HTML fallback)
  const start = performance.now();
  try {
    for (const base of OLLAMA_BASE_CANDIDATES) {
      const data = await fetchJsonIfAvailable<{ models?: Array<{ name: string }> }>(
        `${base}/api/tags`,
        3000
      );
      if (data && Array.isArray(data.models)) {
        resolvedOllamaBase = base;
        health.ollama.online = true;
        health.ollama.latencyMs = Math.round(performance.now() - start);
        health.ollama.models = data.models.map((m) => m.name);
        break;
      }
    }

    if (!health.ollama.online) {
      health.ollama.error = "Ollama daemon not responding with JSON on port 11434";
    }
  } catch (err: unknown) {
    health.ollama.error = err instanceof Error ? err.message : String(err);
  }

  // 2. Probe Cortex OS (must return real JSON, not HTML fallback)
  try {
    for (const url of CORTEX_STATUS_CANDIDATES) {
      const statusData = await fetchJsonIfAvailable<unknown>(url, 2000);
      if (statusData !== null) {
        health.cortex.online = true;
        health.cortex.status = statusData;
        break;
      }
    }
  } catch (err: unknown) {
    health.cortex.error = err instanceof Error ? err.message : String(err);
  }

  return health;
}

export interface QueryModelOptions {
  task?: ProcessTask | undefined;
  model?: string | undefined;
  prompt: string;
  systemPrompt?: string | undefined;
  temperature?: number | undefined;
}

export interface QueryModelResponse {
  response: string;
  modelUsed: string;
  totalDurationMs?: number | undefined;
}

/**
 * Dispatch an inference prompt to the assigned local model manager
 */
export async function queryLocalModel(options: QueryModelOptions): Promise<QueryModelResponse> {
  const { task, prompt, systemPrompt } = options;

  let modelName = options.model;
  let temperature = options.temperature;

  if (!modelName && task && MODEL_HUB_PROCESS_MAP[task]) {
    const config = MODEL_HUB_PROCESS_MAP[task];
    modelName = config.primary;
    if (temperature === undefined) {
      temperature = config.temperature;
    }
  }

  if (!modelName) {
    modelName = "gemma4:12b"; // default high-quality local model
  }

  const endpoint = `${resolvedOllamaBase}/api/generate`;
  const body = {
    model: modelName,
    prompt: prompt,
    system: systemPrompt || "You are an expert 25th Dynasty AI assistant operating within the sovereign local network.",
    stream: false,
    options: {
      temperature: temperature ?? 0.7,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // If primary failed, check fallback if configured
    if (task && MODEL_HUB_PROCESS_MAP[task]) {
      const fallbackModel = MODEL_HUB_PROCESS_MAP[task].fallback;
      if (fallbackModel && fallbackModel !== modelName) {
        const fallbackRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, model: fallbackModel }),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          return {
            response: fallbackData.response,
            modelUsed: fallbackModel,
            totalDurationMs: fallbackData.total_duration ? Math.round(fallbackData.total_duration / 1e6) : undefined,
          };
        }
      }
    }
    throw new Error(`Local model request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    response: data.response,
    modelUsed: modelName,
    totalDurationMs: data.total_duration ? Math.round(data.total_duration / 1e6) : undefined,
  };
}
