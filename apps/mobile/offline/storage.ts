/**
 * MMKV-backed offline storage with fallback to in-memory.
 *
 * - Cache REST responses by queryKey
 * - Persist outgoing-message queue for offline delivery
 * - Queue job restoration
 */
import { useMMKV, type MMKV } from 'react-native-mmkv';

let mmkv: MMKV | null = null;
let memoryStore = new Map<string, string>();

function getStore(): { get: (k: string) => string | undefined; set: (k: string, v: string) => void; delete: (k: string) => void; getAllKeys: () => string[] } {
  if (mmkv) return {
    get: (k) => mmkv!.getString(k),
    set: (k, v) => mmkv!.set(k, v),
    delete: (k) => mmkv!.delete(k),
    getAllKeys: () => mmkv!.getAllKeys(),
  };
  return {
    get: (k) => memoryStore.get(k),
    set: (k, v) => memoryStore.set(k, v),
    delete: (k) => memoryStore.delete(k),
    getAllKeys: () => Array.from(memoryStore.keys()),
  };
}

// Initialize outside of render for non-hook consumers.
try {
  const MMKV = require('react-native-mmkv');
  mmkv = new MMKV.MMKV({ id: 'coder-offline' });
} catch {
  mmkv = null;
}

export const CacheManager = {
  get<T>(key: string): T | null {
    try {
      const raw = getStore().get(`cache:${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { t: number; data: T };
      if (parsed.t && Date.now() - parsed.t > 1000 * 60 * 60 * 24 * 7) {
        getStore().delete(`cache:${key}`);
        return null;
      }
      return parsed.data;
    } catch { return null; }
  },
  set<T>(key: string, data: T): void {
    try {
      getStore().set(`cache:${key}`, JSON.stringify({ t: Date.now(), data }));
    } catch {}
  },
  invalidate(prefix?: string): void {
    const keys = getStore().getAllKeys();
    for (const k of keys) {
      if (k.startsWith('cache:') && (!prefix || k.startsWith(`cache:${prefix}`))) {
        getStore().delete(k);
      }
    }
  },
};

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  attachments?: Array<{ uri: string; type: string; name?: string }>;
  createdAt: number;
  retries: number;
}

export const QueueManager = {
  key: 'queue:outbox',
  enqueue(msg: QueuedMessage) {
    const q = this.list();
    q.push(msg);
    getStore().set(this.key, JSON.stringify(q));
  },
  list(): QueuedMessage[] {
    try {
      const raw = getStore().get(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },
  remove(id: string) {
    const q = this.list().filter((m) => m.id !== id);
    getStore().set(this.key, JSON.stringify(q));
  },
  incrementRetry(id: string) {
    const q = this.list().map((m) => m.id === id ? { ...m, retries: m.retries + 1 } : m);
    getStore().set(this.key, JSON.stringify(q));
  },
  clear() {
    getStore().delete(this.key);
  },
};

export interface Draft {
  conversationId: string;
  text: string;
  updatedAt: number;
}

export const DraftStore = {
  key: 'drafts',
  get(id: string): string {
    try {
      const raw = getStore().get(this.key);
      if (!raw) return '';
      const map = JSON.parse(raw) as Record<string, Draft>;
      return map[id]?.text ?? '';
    } catch { return ''; }
  },
  set(id: string, text: string) {
    const map: Record<string, Draft> = (() => {
      try { return JSON.parse(getStore().get(this.key) || '{}'); } catch { return {}; }
    })();
    if (!text) delete map[id];
    else map[id] = { conversationId: id, text, updatedAt: Date.now() };
    getStore().set(this.key, JSON.stringify(map));
  },
};

export const OfflineStore = {
  cache: CacheManager,
  queue: QueueManager,
  drafts: DraftStore,
};

// Hook variant for consumers that need the MMKV instance.
export function useOfflineStorage() {
  try {
    const instance = useMMKV?.();
    if (instance) mmkv = instance;
  } catch {}
  return OfflineStore;
}
