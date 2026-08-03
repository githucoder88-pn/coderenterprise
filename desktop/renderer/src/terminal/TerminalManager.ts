import { PTYBridge } from './PTYBridge';
import { SessionManager, useTerminalStore } from './SessionManager';
import { terminalStreams } from './StreamManager';

let wired = false;

export class TerminalManager {
  static wire(): void {
    if (wired) return;
    wired = true;
    PTYBridge.onData(({ id, data }) => terminalStreams.append(id, data));
    PTYBridge.onExit(({ id, code }) => useTerminalStore.getState().markExited(id, code));
  }

  static async create(options?: { cwd?: string; shell?: string; env?: Record<string, string> }): Promise<string> {
    TerminalManager.wire();
    const id = await PTYBridge.start(options);
    const count = useTerminalStore.getState().sessions.length + 1;
    useTerminalStore.getState().add({ id, name: SessionManager.name(count, options?.shell), shell: options?.shell, cwd: options?.cwd, createdAt: Date.now() });
    return id;
  }

  static async stop(id: string): Promise<void> {
    await PTYBridge.stop(id);
    useTerminalStore.getState().remove(id);
  }
}
