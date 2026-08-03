import { useAppStore } from '../../stores/app-store';
import { EditorManager } from '../editor/EditorManager';
import { useEditorStore } from '../editor/EditorStore';
import { SymbolManager } from '../editor/SymbolManager';
import { TerminalManager } from '../terminal/TerminalManager';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Command' | 'File' | 'Symbol' | 'Model' | 'Provider';
  execute: () => void | Promise<void>;
}

export function fuzzyScore(value: string, query: string): number {
  if (!query) return 1;
  const target = value.toLowerCase();
  const needle = query.toLowerCase();
  if (target.includes(needle)) return 100 - target.indexOf(needle);
  let cursor = 0;
  let score = 0;
  for (const char of needle) {
    const index = target.indexOf(char, cursor);
    if (index === -1) return 0;
    score += Math.max(1, 12 - (index - cursor));
    cursor = index + 1;
  }
  return score;
}

export function getCommands(query: string): CommandItem[] {
  const app = useAppStore.getState();
  const editor = useEditorStore.getState();
  const commands: CommandItem[] = [
    { id: 'view.toggleTerminal', title: 'View: Toggle Terminal', category: 'Command', execute: app.toggleTerminal },
    { id: 'view.toggleChat', title: 'View: Toggle Chat', category: 'Command', execute: app.toggleChat },
    { id: 'view.toggleSidebar', title: 'View: Toggle Sidebar', category: 'Command', execute: app.toggleSidebar },
    { id: 'terminal.new', title: 'Terminal: New Terminal', category: 'Command', execute: () => TerminalManager.create({}) },
    { id: 'file.save', title: 'File: Save Active File', category: 'Command', execute: () => EditorManager.saveActiveFile() },
    { id: 'theme.dark', title: 'Preferences: Dark Theme', category: 'Command', execute: () => app.setTheme('dark') },
    { id: 'theme.light', title: 'Preferences: Light Theme', category: 'Command', execute: () => app.setTheme('light') },
    ...editor.tabs.map((tab) => ({ id: `file:${tab.path}`, title: tab.name, subtitle: tab.path, category: 'File' as const, execute: () => editor.setActiveTab(tab.id) })),
    ...SymbolManager.workspaceSymbols(query).map((symbol) => ({ id: `symbol:${symbol.path}:${symbol.line}:${symbol.name}`, title: symbol.name, subtitle: `${symbol.kind} — ${symbol.path}:${symbol.line}`, category: 'Symbol' as const, execute: async () => { await EditorManager.openFile(symbol.path); } })),
  ];

  return commands
    .map((command) => ({ command, score: fuzzyScore(`${command.title} ${command.subtitle ?? ''} ${command.category}`, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ command }) => command)
    .slice(0, 60);
}
