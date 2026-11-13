import { useState, useEffect, useRef } from "react";
import {
  useNotificationLog,
  clearNotificationLog,
  type NotificationLevel,
} from "@/lib/notificationLog";
import { Button } from "@/components/ui/button";
import { Terminal, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const LEVEL_STYLES: Record<NotificationLevel, { badge: string; text: string; label: string }> = {
  success: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    text: "text-emerald-300",
    label: "OK",
  },
  info: {
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    text: "text-sky-200",
    label: "INFO",
  },
  warning: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    text: "text-amber-200",
    label: "WARN",
  },
  error: {
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    text: "text-rose-300",
    label: "ERR",
  },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

export function NotificationTerminal() {
  const entries = useNotificationLog();
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!collapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, collapsed]);

  return (
    <div className="rounded-2xl border border-border/70 bg-zinc-950/95 text-zinc-100 shadow-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs font-semibold tracking-wider uppercase text-zinc-200">
            Session Notification Terminal
          </span>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-zinc-500">
            · Persists until logged off
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {entries.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearNotificationLog}
              className="h-7 gap-1 px-2 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((c) => !c)}
            className="h-7 gap-1 px-2 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            {collapsed ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Expand
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Collapse
              </>
            )}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div
          ref={scrollRef}
          className="max-h-48 overflow-y-auto px-4 py-3 font-mono text-xs space-y-1.5"
        >
          {entries.length === 0 ? (
            <p className="text-zinc-500 italic">
              [ready] No notifications yet in this session. Actions (cover updates, tier edits, publishes, errors) will appear here until you log off.
            </p>
          ) : (
            entries.map((entry) => {
              const style = LEVEL_STYLES[entry.level];
              return (
                <div key={entry.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="shrink-0 text-zinc-500">{formatTime(entry.timestamp)}</span>
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0 text-[10px] font-bold ${style.badge}`}
                  >
                    {style.label}
                  </span>
                  <span className="shrink-0 text-zinc-500">[{entry.source}]</span>
                  <span className={`break-words ${style.text}`}>{entry.message}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

