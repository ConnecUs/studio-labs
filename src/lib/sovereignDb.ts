import type { Tool } from "@/lib/tools";

export interface SovereignUser {
  id: string;
  email: string;
  displayName: string;
  role: "member" | "admin";
  isPremium: boolean;
  createdAt: string;
}

interface StoredUserRecord extends SovereignUser {
  passwordHash: string;
  recoveryCode?: string;
}

export interface SavedItem {
  id: string;
  user_id: string;
  title: string;
  url: string;
  note: string;
  tool_id: string | null;
  created_at: string;
}

const DB_NAME = "kush_studio_labs_db";
const DB_VERSION = 1;
const SESSION_KEY = "kush_sovereign_session";
const USERS_FALLBACK_KEY = "kush_sovereign_users";
const SAVED_FALLBACK_KEY = "kush_sovereign_saved_items";
const AUTH_EVENT = "kush-sovereign-auth-change";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function emitAuthChange(user: SovereignUser | null): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: user }));
}

async function hashPassword(email: string, password: string): Promise<string> {
  const input = `${email.toLowerCase().trim()}::${password}`;
  if (isBrowser() && window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback deterministic hash when subtle crypto is unavailable
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser() || !("indexedDB" in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "email" });
        }
        if (!db.objectStoreNames.contains("saved_items")) {
          db.createObjectStore("saved_items", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("tools")) {
          db.createObjectStore("tools", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[] | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetOne<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut<T>(storeName: string, value: T): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(storeName: string, key: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbReplaceAll<T>(storeName: string, items: T[]): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function getFallbackUsers(): Record<string, StoredUserRecord> {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(localStorage.getItem(USERS_FALLBACK_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveFallbackUsers(map: Record<string, StoredUserRecord>): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(USERS_FALLBACK_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

async function findUserByEmail(email: string): Promise<StoredUserRecord | null> {
  const normalized = email.toLowerCase().trim();
  const fromIdb = await idbGetOne<StoredUserRecord>("users", normalized);
  if (fromIdb) return fromIdb;
  const fallback = getFallbackUsers();
  return fallback[normalized] ?? null;
}

async function saveUserRecord(record: StoredUserRecord): Promise<void> {
  await idbPut("users", record);
  const fallback = getFallbackUsers();
  fallback[record.email] = record;
  saveFallbackUsers(fallback);
}

function toPublicUser(rec: StoredUserRecord): SovereignUser {
  return {
    id: rec.id,
    email: rec.email,
    displayName: rec.displayName,
    role: rec.role,
    isPremium: rec.isPremium,
    createdAt: rec.createdAt,
  };
}

function setSession(user: SovereignUser | null): void {
  if (!isBrowser()) return;
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
  emitAuthChange(user);
}

export const sovereignAuth = {
  getSessionSync(): SovereignUser | null {
    if (!isBrowser()) return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as SovereignUser) : null;
    } catch {
      return null;
    }
  },

  async getUser(): Promise<SovereignUser | null> {
    return this.getSessionSync();
  },

  onAuthStateChange(cb: (user: SovereignUser | null) => void): () => void {
    if (!isBrowser()) return () => {};
    const handler = (e: Event) => {
      cb((e as CustomEvent<SovereignUser | null>).detail ?? null);
    };
    window.addEventListener(AUTH_EVENT, handler);
    return () => window.removeEventListener(AUTH_EVENT, handler);
  },

  async signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ user?: SovereignUser; error?: string }> {
    const normalized = email.toLowerCase().trim();
    if (!normalized || !password || password.length < 6) {
      return { error: "Please enter a valid email and a password of at least 6 characters." };
    }
    const existing = await findUserByEmail(normalized);
    if (existing) {
      return { error: "An account with this email already exists in this browser." };
    }
    const passwordHash = await hashPassword(normalized, password);
    const record: StoredUserRecord = {
      id: crypto.randomUUID(),
      email: normalized,
      displayName: displayName?.trim() || normalized.split("@")[0] || "Creator",
      role: "member",
      isPremium: true, // Sovereign local lab bench unlocked by default
      createdAt: new Date().toISOString(),
      passwordHash,
    };
    await saveUserRecord(record);
    const pub = toPublicUser(record);
    setSession(pub);
    return { user: pub };
  },

  async signInWithPassword(
    email: string,
    password: string
  ): Promise<{ user?: SovereignUser; error?: string }> {
    const normalized = email.toLowerCase().trim();
    const record = await findUserByEmail(normalized);
    if (!record) {
      return { error: "No local account found for this email in this browser." };
    }
    const passwordHash = await hashPassword(normalized, password);
    if (record.passwordHash !== passwordHash) {
      return { error: "Incorrect password." };
    }
    const pub = toPublicUser(record);
    setSession(pub);
    return { user: pub };
  },

  async requestPasswordRecovery(
    email: string
  ): Promise<{ code?: string; error?: string }> {
    const normalized = email.toLowerCase().trim();
    const record = await findUserByEmail(normalized);
    if (!record) {
      return { error: "No local account found for this email in this browser." };
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await saveUserRecord({ ...record, recoveryCode: code });
    return { code };
  },

  async resetPasswordWithCode(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ user?: SovereignUser; error?: string }> {
    const normalized = email.toLowerCase().trim();
    const record = await findUserByEmail(normalized);
    if (!record) {
      return { error: "Account not found." };
    }
    if (!record.recoveryCode || record.recoveryCode !== code.trim()) {
      return { error: "Invalid recovery code." };
    }
    if (!newPassword || newPassword.length < 6) {
      return { error: "New password must be at least 6 characters." };
    }
    const passwordHash = await hashPassword(normalized, newPassword);
    const updated: StoredUserRecord = { ...record, passwordHash };
    delete updated.recoveryCode;
    await saveUserRecord(updated);
    const pub = toPublicUser(updated);
    setSession(pub);
    return { user: pub };
  },

  async signOut(): Promise<void> {
    setSession(null);
  },
};

export const sovereignSavedItems = {
  async list(userId: string): Promise<SavedItem[]> {
    const fromIdb = await idbGetAll<SavedItem>("saved_items");
    let all: SavedItem[] = [];
    if (fromIdb) {
      all = fromIdb;
    } else if (isBrowser()) {
      try {
        all = JSON.parse(localStorage.getItem(SAVED_FALLBACK_KEY) || "[]");
      } catch {
        all = [];
      }
    }
    return all
      .filter((item) => item.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async add(item: Omit<SavedItem, "id" | "created_at">): Promise<SavedItem> {
    const full: SavedItem = {
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await idbPut("saved_items", full);
    if (isBrowser()) {
      try {
        const cur: SavedItem[] = JSON.parse(localStorage.getItem(SAVED_FALLBACK_KEY) || "[]");
        cur.unshift(full);
        localStorage.setItem(SAVED_FALLBACK_KEY, JSON.stringify(cur));
      } catch {
        // ignore
      }
    }
    return full;
  },

  async remove(id: string): Promise<void> {
    await idbDelete("saved_items", id);
    if (isBrowser()) {
      try {
        const cur: SavedItem[] = JSON.parse(localStorage.getItem(SAVED_FALLBACK_KEY) || "[]");
        localStorage.setItem(
          SAVED_FALLBACK_KEY,
          JSON.stringify(cur.filter((item) => item.id !== id))
        );
      } catch {
        // ignore
      }
    }
  },
};

export const sovereignToolsDb = {
  async list(): Promise<Tool[] | null> {
    const rows = await idbGetAll<Tool>("tools");
    return rows && rows.length > 0 ? rows : null;
  },
  async saveAll(tools: Tool[]): Promise<void> {
    await idbReplaceAll("tools", tools);
  },
  async clear(): Promise<void> {
    await idbReplaceAll("tools", []);
  },
};
