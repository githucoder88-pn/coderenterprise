/**
 * File Editor — Code viewer with syntax-aware display
 */

import { useState } from 'react';
import { cn } from '../../lib/utils';
import { FileCode, X, Save } from 'lucide-react';

interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  modified: boolean;
  language: string;
}

export function FileEditor() {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const closeTab = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter((t) => t.id !== id);
      setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1]!.id : null);
    }
  };

  if (tabs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <FileCode className="mx-auto h-10 w-10 text-[var(--color-border)]" />
          <p className="mt-3 text-[13px] text-[var(--color-text-tertiary)]">Open a file to start editing</p>
          <p className="mt-1 text-[12px] text-[var(--color-text-tertiary)]">Use the explorer or ⌘P to open files</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab Bar */}
      <div className="flex h-9 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              'group flex h-full items-center gap-1.5 border-r border-[var(--color-border)] px-3 text-[12px] transition-colors',
              tab.id === activeTabId ? 'bg-[var(--color-bg)] text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)]',
            )}
          >
            <span className="max-w-[120px] truncate">{tab.name}</span>
            {tab.modified && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-muted)]"
            >
              <X className="h-3 w-3" />
            </button>
          </button>
        ))}
      </div>

      {/* Editor Content */}
      {activeTab && (
        <div className="flex-1 overflow-auto bg-[var(--color-bg)]">
          <pre className="p-4 text-[13px] leading-6 font-mono text-[var(--color-text)] whitespace-pre-wrap">
            {activeTab.content}
          </pre>
        </div>
      )}
    </div>
  );
}
