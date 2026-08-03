/**
 * Extension Storage
 *
 * Isolated key-value storage per extension.
 */

import type { ILogger } from '../../telemetry/logger.js';

interface StorageEntry {
  key: string;
  value: string;
  updatedAt: Date;
}

export interface IExtensionStorage {
  get<T>(extensionId: string, key: string): Promise<T | null>;
  set<T>(extensionId: string, key: string, value: T): Promise<void>;
  delete(extensionId: string, key: string): Promise<void>;
  keys(extensionId: string): Promise<readonly string[]>;
  clear(extensionId: string): Promise<void>;
  getSize(extensionId: string): Promise<number>;
}

export class ExtensionStorage implements IExtensionStorage {
  private readonly stores = new Map<string, Map<string, StorageEntry>>();
  private readonly maxEntriesPerExtension = 10_000;
  private readonly maxValueSizeBytes = 1024 * 1024; // 1MB

  constructor(_logger: ILogger) {}

  async get<T>(extensionId: string, key: string): Promise<T | null> {
    const store = this.stores.get(extensionId);
    if (!store) return null;
    const entry = store.get(key);
    if (!entry) return null;
    try { return JSON.parse(entry.value) as T; } catch { return null; }
  }

  async set<T>(extensionId: string, key: string, value: T): Promise<void> {
    if (!this.stores.has(extensionId)) this.stores.set(extensionId, new Map());
    const store = this.stores.get(extensionId)!;

    if (store.size >= this.maxEntriesPerExtension && !store.has(key)) {
      throw new Error(`Storage limit reached for extension ${extensionId}`);
    }

    const serialized = JSON.stringify(value);
    if (serialized.length > this.maxValueSizeBytes) {
      throw new Error(`Value exceeds maximum size of ${this.maxValueSizeBytes} bytes`);
    }

    store.set(key, { key, value: serialized, updatedAt: new Date() });
  }

  async delete(extensionId: string, key: string): Promise<void> {
    this.stores.get(extensionId)?.delete(key);
  }

  async keys(extensionId: string): Promise<readonly string[]> {
    return [...(this.stores.get(extensionId)?.keys() ?? [])];
  }

  async clear(extensionId: string): Promise<void> {
    this.stores.delete(extensionId);
  }

  async getSize(extensionId: string): Promise<number> {
    const store = this.stores.get(extensionId);
    if (!store) return 0;
    let size = 0;
    for (const entry of store.values()) size += entry.value.length;
    return size;
  }
}
