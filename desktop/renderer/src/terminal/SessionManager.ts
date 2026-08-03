import { create } from 'zustand';

export interface TerminalSessionState {
  id: string;
  name: string;
  shell?: string;
  cwd?: string;
  createdAt: number;
  exitCode?: number;
}

interface TerminalStore {
  sessions: TerminalSessionState[];
  activeId: string | null;
  add: (session: TerminalSessionState) => void;
  activate: (id: string) => void;
  remove: (id: string) => void;
  markExited: (id: string, code: number) => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: [],
  activeId: null,
  add: (session) => set((state) => ({ sessions: [...state.sessions, session], activeId: session.id })),
  activate: (id) => set({ activeId: id }),
  remove: (id) => set((state) => ({ sessions: state.sessions.filter((session) => session.id !== id), activeId: state.activeId === id ? state.sessions.filter((session) => session.id !== id).at(-1)?.id ?? null : state.activeId })),
  markExited: (id, code) => set((state) => ({ sessions: state.sessions.map((session) => session.id === id ? { ...session, exitCode: code } : session) })),
}));

export class SessionManager {
  static name(index: number, shell?: string): string {
    return shell ? shell.split(/[\\/]/).at(-1) ?? `Terminal ${index}` : `Terminal ${index}`;
  }
}
