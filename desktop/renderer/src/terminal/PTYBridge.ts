export class PTYBridge {
  static start(options?: { cwd?: string; shell?: string; env?: Record<string, string> }): Promise<string> {
    return window.coder.terminal.start(options ?? {});
  }

  static write(id: string, data: string): Promise<void> {
    return window.coder.terminal.write(id, data);
  }

  static resize(id: string, cols: number, rows: number): Promise<void> {
    return window.coder.terminal.resize(id, cols, rows);
  }

  static stop(id: string): Promise<void> {
    return window.coder.terminal.stop(id);
  }

  static onData(callback: (event: { id: string; data: string }) => void): () => void {
    return window.coder.terminal.onData(callback);
  }

  static onExit(callback: (event: { id: string; code: number }) => void): () => void {
    return window.coder.terminal.onExit(callback);
  }
}
