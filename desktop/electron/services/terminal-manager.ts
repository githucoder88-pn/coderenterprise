/**
 * Terminal Manager
 *
 * Manages multiple PTY terminal sessions.
 */

import { spawn, type IPty } from 'node-pty';
import { homedir } from 'node:os';

interface TerminalSession {
  id: string;
  pty: IPty;
  onData: (data: string) => void;
  onExit: (code: number) => void;
}

class TerminalManager {
  private sessions = new Map<string, TerminalSession>();

  create(options: { cwd?: string; shell?: string; env?: Record<string, string> }): string {
    const id = `term-${Date.now()}`;
    const shell = options.shell ?? (process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL ?? '/bin/bash');
    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: options.cwd ?? homedir(),
      env: { ...process.env, ...options.env } as Record<string, string>,
    });

    const session: TerminalSession = {
      id,
      pty,
      onData: () => {},
      onExit: () => {},
    };

    pty.onData((data) => session.onData(data));
    pty.onExit(({ exitCode }) => {
      session.onExit(exitCode);
      this.sessions.delete(id);
    });

    this.sessions.set(id, session);
    return id;
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.pty.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    this.sessions.get(id)?.pty.resize(cols, rows);
  }

  stop(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.kill();
      this.sessions.delete(id);
    }
  }

  onData(id: string, callback: (data: string) => void): void {
    const session = this.sessions.get(id);
    if (session) session.onData = callback;
  }

  onExit(id: string, callback: (code: number) => void): void {
    const session = this.sessions.get(id);
    if (session) session.onExit = callback;
  }

  stopAll(): void {
    for (const [id] of this.sessions) this.stop(id);
  }
}

export const terminalManager = new TerminalManager();
