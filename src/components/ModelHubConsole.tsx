import { useState, useEffect } from "react";
import {
  checkModelHubStatus,
  queryLocalModel,
  MODEL_HUB_PROCESS_MAP,
  type ProcessTask,
  type ModelHubHealth,
} from "@/lib/modelHubRouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Activity, Cpu, Server, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function ModelHubConsole() {
  const [health, setHealth] = useState<ModelHubHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProcessTask>("deep_reasoning_qa");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("Analyze the architectural strengths of the 25th Dynasty sovereign desktop ecosystem.");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [duration, setDuration] = useState<number | null>(null);

  const loadHealth = async () => {
    setLoadingHealth(true);
    try {
      const data = await checkModelHubStatus();
      setHealth(data);
      if (data.ollama.models.length > 0 && !selectedModel) {
        const defaultModel = MODEL_HUB_PROCESS_MAP[selectedTask]?.primary || data.ollama.models[0];
        if (defaultModel) setSelectedModel(defaultModel);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const handleTaskChange = (taskKey: ProcessTask) => {
    setSelectedTask(taskKey);
    const config = MODEL_HUB_PROCESS_MAP[taskKey];
    if (config) {
      setSelectedModel(config.primary);
    }
  };

  const runInference = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    setGenerating(true);
    setResult("");
    setDuration(null);
    try {
      const res = await queryLocalModel({
        task: selectedTask,
        model: selectedModel || undefined,
        prompt,
      });
      setResult(res.response);
      setDuration(res.totalDurationMs || null);
      toast.success(`Inference finished using ${res.modelUsed}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Inference failed: ${message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
      {/* Header & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Cpu className="h-6 w-6 text-primary" />
            25th Dynasty Model Management Hub
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sovereign local LLM & multi-agent routing daemon
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={health?.ollama.online ? "default" : "destructive"} className="gap-1.5 py-1 px-3">
            <Server className="h-3.5 w-3.5" />
            Ollama :11434 {health?.ollama.online ? `(${health.ollama.latencyMs}ms)` : "(Offline)"}
          </Badge>
          <Badge variant={health?.cortex.online ? "secondary" : "outline"} className="gap-1.5 py-1 px-3">
            <Activity className="h-3.5 w-3.5" />
            Cortex Swarm :8000 {health?.cortex.online ? "(Active)" : "(Idle)"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={loadHealth} disabled={loadingHealth}>
            <RefreshCw className={`h-4 w-4 ${loadingHealth ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Task & Model Matrix */}
      <div>
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Assigned 25th Dynasty Tasks & Specialized Models
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(MODEL_HUB_PROCESS_MAP) as ProcessTask[]).map((taskKey) => {
            const config = MODEL_HUB_PROCESS_MAP[taskKey];
            const isSelected = selectedTask === taskKey;
            return (
              <button
                key={taskKey}
                onClick={() => handleTaskChange(taskKey)}
                className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/60"
                }`}
              >
                <span className="font-semibold text-xs text-foreground">{config.label}</span>
                <span className="mt-1 font-mono text-[11px] text-primary truncate">{config.primary}</span>
                <span className="mt-1 text-[10px] text-muted-foreground line-clamp-2">
                  {config.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inference Playground */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-muted-foreground">Active Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {health?.ollama.models && health.ollama.models.length > 0 ? (
                health.ollama.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              ) : (
                <option value={MODEL_HUB_PROCESS_MAP[selectedTask]?.primary}>
                  {MODEL_HUB_PROCESS_MAP[selectedTask]?.primary}
                </option>
              )}
            </select>
          </div>
          {duration && (
            <span className="font-mono text-xs text-muted-foreground">
              Latency: {duration}ms
            </span>
          )}
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt for the local model manager..."
          className="min-h-[100px] font-sans"
        />

        <div className="flex justify-end">
          <Button onClick={runInference} disabled={generating || !health?.ollama.online} className="gap-2">
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Querying Local Model...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run Local Inference
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Output Display */}
      {result && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2">
            <span className="font-mono text-xs text-primary font-semibold">Response Output</span>
            <span className="font-mono text-xs text-muted-foreground">{selectedModel}</span>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
