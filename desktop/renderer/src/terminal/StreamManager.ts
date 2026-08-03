type Listener = (data: string) => void;

export class StreamManager {
  private listeners = new Map<string, Set<Listener>>();
  private buffers = new Map<string, string>();

  append(id: string, data: string): void {
    this.buffers.set(id, `${this.buffers.get(id) ?? ''}${data}`.slice(-100_000));
    this.listeners.get(id)?.forEach((listener) => listener(data));
  }

  snapshot(id: string): string {
    return this.buffers.get(id) ?? '';
  }

  subscribe(id: string, listener: Listener): () => void {
    const listeners = this.listeners.get(id) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(id, listeners);
    return () => listeners.delete(listener);
  }
}

export const terminalStreams = new StreamManager();
