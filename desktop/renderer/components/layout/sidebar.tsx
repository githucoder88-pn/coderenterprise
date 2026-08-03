/**
 * Sidebar — File explorer + navigation
 */

import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';
import { cn } from '../../lib/utils';
import {
  FolderOpen, MessageSquare, Cpu, Terminal, Settings, Search,
  File, ChevronRight, ChevronDown, FileCode, FileText,
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

const NAV_ITEMS = [
  { id: 'files', label: 'Explorer', icon: FolderOpen },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function FileTreeItem({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = node.isDir ? (expanded ? ChevronDown : ChevronRight) : (node.name.endsWith('.ts') || node.name.endsWith('.tsx') ? FileCode : File);

  return (
    <div>
      <button
        onClick={() => node.isDir ? setExpanded(!expanded) : undefined}
        className="flex w-full items-center gap-1.5 py-0.5 px-2 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {expanded && node.children?.map((child) => (
        <FileTreeItem key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function Sidebar() {
  const [activeTab, setActiveTab] = useState('files');

  return (
    <aside className="flex w-[240px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
      {/* Activity Bar */}
      <div className="flex w-10 flex-col items-center gap-1 border-r border-[var(--color-border)] py-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors',
              activeTab === item.id ? 'bg-[var(--color-bg-muted)] text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
            )}
            title={item.label}
          >
            <item.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-8 items-center border-b border-[var(--color-border)] px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {activeTab === 'files' && <FileExplorer />}
          {activeTab === 'chat' && <ChatPanel />}
          {activeTab === 'models' && <ModelsPanel />}
          {activeTab === 'terminal' && <TerminalPanel />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </aside>
  );
}

function FileExplorer() {
  return (
    <div className="px-1">
      <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 mx-1 mb-2">
        <Search className="h-3 w-3 text-[var(--color-text-tertiary)]" />
        <input placeholder="Search files…" className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-[var(--color-text-tertiary)]" />
      </div>
      <div className="text-[12px] text-[var(--color-text-tertiary)] px-3 py-4">Open a workspace to explore files</div>
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="px-2 py-2">
      <button className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]">
        + New Conversation
      </button>
      <div className="mt-3 text-[12px] text-[var(--color-text-tertiary)] px-1">No conversations yet</div>
    </div>
  );
}

function ModelsPanel() {
  return (
    <div className="px-2 py-2">
      <div className="text-[12px] text-[var(--color-text-tertiary)] px-1">Sync providers to load models</div>
    </div>
  );
}

function TerminalPanel() {
  return (
    <div className="px-2 py-2">
      <button className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]">
        + New Terminal
      </button>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="px-2 py-2 space-y-2">
      <div className="text-[12px] text-[var(--color-text-tertiary)] px-1">Application settings</div>
    </div>
  );
}
