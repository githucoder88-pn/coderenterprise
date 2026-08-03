/**
 * SyncManager — restores queued messages when connectivity returns.
 * Lightweight: uses react-native NetInfo-free approach via fetch probe.
 */
import { AppState, AppStateStatus } from 'react-native';
import { QueueManager, QueuedMessage } from './storage';
import { api } from '@/services/api';

type Listener = (online: boolean) => void;

class SyncManagerImpl {
  private online = true;
  private listeners: Listener[] = [];
  private inited = false;

  init() {
    if (this.inited) return;
    this.inited = true;
    this.probe();
    if (typeof AppState !== 'undefined') {
      AppState.addEventListener('change', (s: AppStateStatus) => {
        if (s === 'active') this.probe();
      });
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  isOnline(): boolean {
    return this.online;
  }

  private async probe() {
    try {
      await api.health();
      this.setOnline(true);
      // Attempt to flush queue
      this.flushQueue().catch(() => {});
    } catch {
      this.setOnline(false);
    }
  }

  private setOnline(online: boolean) {
    if (this.online === online) return;
    this.online = online;
    for (const l of this.listeners) {
      try { l(online); } catch {}
    }
  }

  async enqueue(msg: QueuedMessage) {
    QueueManager.enqueue(msg);
    if (this.online) this.flushQueue().catch(() => {});
  }

  async flushQueue() {
    const q = QueueManager.list();
    for (const m of q) {
      if (m.retries >= 5) { QueueManager.remove(m.id); continue; }
      try {
        await api.sendMessage(m.conversationId, { content: m.content });
        QueueManager.remove(m.id);
      } catch {
        QueueManager.incrementRetry(m.id);
      }
    }
  }
}

export const SyncManager = new SyncManagerImpl();
