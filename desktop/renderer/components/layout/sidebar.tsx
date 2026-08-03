/**
 * Sidebar — Activity bar plus production file explorer shell.
 */

import { useState } from 'react';
import { Cpu, FolderOpen, MessageSquare, Settings, Terminal } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { cn } from '../../lib/utils';
import { TreeView } from '../../src/explorer/TreeView';

const NAV_ITEMS = [
  { id: 'files', label: 'Explorer', icon: FolderOpen },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type NavId = typeof NAV_ITEMS[number]['id'];

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<NavId>('files');

  return (
    <aside className="flex w-[260px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
      <div className="flex w-10 flex-col items-center gap-1 border-r border-[var(--color-border)] py-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-all duration-150',
              activeTab === item.id ? 'bg-[var(--color-bg-muted)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-tertiary)] hover:scale-105 hover:text-[var(--color-text-secondary)]',
            )}
            title={item.label}
          >
            <item.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-8 items-center border-b border-[var(--color-border)] px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            {NAV_ITEMS.find((item) => item.id === activeTab)?.label}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {activeTab === 'files' && <TreeView />}
          {activeTab === 'chat' && <ChatPanel />}
          {activeTab === 'models' && <ModelsPanel />}
          {activeTab === 'terminal' && <TerminalPanel />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </aside>
  );
}

function ChatPanel() {
  return (
    <div className="px-2 py-2">
      <button className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)]">
        + New Conversation
      </button>
      <div className="mt-3 px-1 text-[12px] text-[var(--color-text-tertiary)]">No conversations yet</div>
    </div>
  );
}

function ModelsPanel() {
  return <div className="px-3 py-3 text-[12px] text-[var(--color-text-tertiary)]">Sync providers to load available models.</div>;
}

function TerminalPanel() {
  const toggleTerminal = useAppStore((state) => state.toggleTerminal);
  return (
    <div className="px-2 py-2">
      <button onClick={toggleTerminal} className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)]">
        Toggle Integrated Terminal
      </button>
    </div>
  );
}

function SettingsPanel() {
  return <div className="px-3 py-3 text-[12px] text-[var(--color-text-tertiary)]">Application settings</div>;
}
