import { basename, languageFromPath, useEditorStore } from './EditorStore';
import { SymbolManager } from './SymbolManager';

function unwrapContent(response: unknown): string {
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    const content = record.content ?? record.data ?? record.text;
    if (typeof content === 'string') return content;
  }
  return '';
}

export class EditorManager {
  static async openFile(path: string): Promise<void> {
    const existing = useEditorStore.getState().tabs.find((tab) => tab.path === path);
    if (existing) {
      useEditorStore.getState().setActiveTab(existing.id);
      return;
    }

    const response = await window.coder.workspace.readFile(path);
    const content = unwrapContent(response);
    const tab = {
      id: `editor:${path}`,
      name: basename(path),
      path,
      content,
      language: languageFromPath(path),
      modified: false,
    };

    useEditorStore.getState().openTab(tab);
    SymbolManager.refresh(path, content);
  }

  static async saveFile(id: string): Promise<void> {
    const tab = useEditorStore.getState().tabs.find((candidate) => candidate.id === id);
    if (!tab || tab.readonly) return;

    await window.coder.workspace.writeFile(tab.path, tab.content);
    useEditorStore.getState().markSaved(id);
    SymbolManager.refresh(tab.path, tab.content);
  }

  static async saveActiveFile(): Promise<void> {
    const { activeTabId } = useEditorStore.getState();
    if (activeTabId) await EditorManager.saveFile(activeTabId);
  }
}
