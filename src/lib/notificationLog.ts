import { useSyncExternalStore } from "react";
import { toast } from "sonner";

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface NotificationEntry {
  id: string;
  timestamp: string;
  level: NotificationLevel;
  source: string;
  message: string;
}

const SESSION_LOG_KEY = "kush_studio_notification_log_v1";
const LOG_EVENT = "kush-studio-notification-log-change";
const MAX_ENTRIES = 200;
const EMPTY_LOG: NotificationEntry[] = [];

let cachedRaw: string | null = null;
let cachedSnapshot: NotificationEntry[] = EMPTY_LOG;

function readEntries(): NotificationEntry[] {
  if (typeof window === "undefined") return EMPTY_LOG;
  try {
    const raw = sessionStorage.getItem(SESSION_LOG_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    cachedSnapshot = raw ? (JSON.parse(raw) as NotificationEntry[]) : EMPTY_LOG;
    return cachedSnapshot;
  } catch {
    return EMPTY_LOG;
  }
}

function writeEntries(entries: NotificationEntry[]): void {
  if (typeof window === "undefined") return;
  const trimmed = entries.slice(-MAX_ENTRIES);
  const serialized = JSON.stringify(trimmed);
  try {
    sessionStorage.setItem(SESSION_LOG_KEY, serialized);
    cachedRaw = serialized;
    cachedSnapshot = trimmed;
  } catch {
    // ignore sessionStorage quota errors
  }
  window.dispatchEvent(new CustomEvent(LOG_EVENT));
}

export function appendNotification(
  level: NotificationLevel,
  message: string,
  source = "admin"
): void {
  if (typeof window === "undefined") return;
  const current = readEntries();
  const entry: NotificationEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
  };
  writeEntries([...current, entry]);
}

export function clearNotificationLog(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_LOG_KEY);
  } catch {
    // ignore
  }
  cachedRaw = null;
  cachedSnapshot = EMPTY_LOG;
  window.dispatchEvent(new CustomEvent(LOG_EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(LOG_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(LOG_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useNotificationLog(): NotificationEntry[] {
  return useSyncExternalStore(subscribe, readEntries, () => EMPTY_LOG);
}

export const notify = {
  success(message: string, source = "admin") {
    appendNotification("success", message, source);
    toast.success(message);
  },
  error(message: string, source = "admin") {
    appendNotification("error", message, source);
    toast.error(message);
  },
  info(message: string, source = "admin") {
    appendNotification("info", message, source);
    toast.info(message);
  },
  warning(message: string, source = "admin") {
    appendNotification("warning", message, source);
    toast.warning(message);
  },
};

