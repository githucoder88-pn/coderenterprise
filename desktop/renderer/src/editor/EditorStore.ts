import { create } from 'zustand';

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  modified: boolean;
  readonly?: boolean;
}

export interface EditorDiagnostic {
  path: string;
  message: string;
  severity: 'hint' | 'info' | 'warning' | 'error';
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  source?: string;
}

export interface WorkspaceSymbol {
  name: string;
  kind: string;
  path: string;
  line: number;
  column: number;
}

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;
  diagnostics: Record<string, EditorDiagnostic[]>;
  symbols: Record<string, WorkspaceSymbol[]>;
  openTab: (tab: EditorTab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  updateContent: (id: string, content: string) => void;
  markSaved: (id: string, content?: string) => void;
  setDiagnostics: (path: string, diagnostics: EditorDiagnostic[]) => void;
  setSymbols: (path: string, symbols: WorkspaceSymbol[]) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  diagnostics: {},
  symbols: {},
  openTab: (tab) => set((state) => {
    const existing = state.tabs.find((candidate) => candidate.path === tab.path);
    if (existing) return { activeTabId: existing.id };
    return { tabs: [...state.tabs, tab], activeTabId: tab.id };
  }),
  closeTab: (id) => set((state) => {
    const tabs = state.tabs.filter((tab) => tab.id !== id);
    const activeTabId = state.activeTabId === id ? tabs.at(-1)?.id ?? null : state.activeTabId;
    return { tabs, activeTabId };
  }),
  setActiveTab: (id) => set({ activeTabId: id }),
  updateContent: (id, content) => set((state) => ({
    tabs: state.tabs.map((tab) => tab.id === id ? { ...tab, content, modified: true } : tab),
  })),
  markSaved: (id, content) => set((state) => ({
    tabs: state.tabs.map((tab) => tab.id === id ? { ...tab, content: content ?? tab.content, modified: false } : tab),
  })),
  setDiagnostics: (path, diagnostics) => set((state) => ({ diagnostics: { ...state.diagnostics, [path]: diagnostics } })),
  setSymbols: (path, symbols) => set((state) => ({ symbols: { ...state.symbols, [path]: symbols } })),
}));

export function languageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': return 'typescript';
    case 'tsx': return 'typescript';
    case 'js': return 'javascript';
    case 'jsx': return 'javascript';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'css': return 'css';
    case 'scss': return 'scss';
    case 'html': return 'html';
    case 'py': return 'python';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'java': return 'java';
    case 'yml':
    case 'yaml': return 'yaml';
    default: return 'plaintext';
  }
}

export function basename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}
