/**
 * Title Bar — compact workspace switcher and product chrome.
 */

import { useEffect, useState } from 'react';
import { Folder, PanelLeft, MessageSquare, Terminal } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';

interface WorkspaceSummary {
  id: string;
  name: string;
  path?: string;
}

function normalizeWorkspaces(response: unknown): WorkspaceSummary[] {
  const items = Array.isArray(response)
    ? response
    : Array.isArray((response as Record<string, unknown> | null)?.workspaces)
      ? (response as Record<string, unknown>).workspaces as unknown[]
      : Array.isArray((response as Record<string, unknown> | null)?.data)
        ? (response as Record<string, unknown>).data as unknown[]
        : [];
  return items.map((item) => {
    const record = item as Record<string, unknown>;
    const id = String(record.id ?? record.workspaceId ?? record.path ?? '');
    const path = typeof record.path === 'string' ? record.path : undefined;
    return { id, path, name: String(record.name ?? path?.split('/').at(-1) ?? id) };
  }).filter((item) => item.id);
}

export function TitleBar() {
  const { activeWorkspaceId, setActiveWorkspace, toggleSidebar, toggleChat, toggleTerminal } = useAppStore();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    window.coder.workspace.list().then((response) => {
      if (cancelled) return;
      const normalized = normalizeWorkspaces(response);
      setWorkspaces(normalized);
      if (!activeWorkspaceId && normalized[0]) setActiveWorkspace(normalized[0].id);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [activeWorkspaceId, setActiveWorkspace]);

  return (
    <div className="titlebar-drag flex h-10 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3">
      <div className="titlebar-no-drag flex items-center gap-1">
        <button onClick={toggleSidebar} className="rounded p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"><PanelLeft className="h-4 w-4" /></button>
        <button onClick={toggleTerminal} className="rounded p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"><Terminal className="h-4 w-4" /></button>
        <button onClick={toggleChat} className="rounded p-1.5 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"><MessageSquare className="h-4 w-4" /></button>
      </div>

      <div className="titlebar-no-drag mx-auto flex min-w-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1">
        <Folder className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        {workspaces.length > 0 ? (
          <select value={activeWorkspaceId ?? ''} onChange={(event) => setActiveWorkspace(event.target.value || null)} className="max-w-[320px] bg-transparent text-center text-[12px] font-medium text-[var(--color-text-secondary)] outline-none">
            {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
        ) : (
          <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">CODER</span>
        )}
      </div>

      <div className="w-[92px]" />
    </div>
  );
}
