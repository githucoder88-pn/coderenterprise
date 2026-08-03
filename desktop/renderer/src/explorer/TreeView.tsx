import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { FileManager, type FileNode } from './FileManager';
import { SearchManager } from './SearchManager';
import { FileWatcher } from './FileWatcher';
import { TreeNode } from './TreeNode';

export function TreeView() {
  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    setError(null);
    try {
      setNodes(await FileManager.list(activeWorkspaceId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load workspace files');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!activeWorkspaceId) return;
    const watcher = new FileWatcher();
    return watcher.start(() => { void load(); }, 8000);
  }, [activeWorkspaceId, load]);

  const visibleNodes = useMemo(() => SearchManager.filter(nodes, query), [nodes, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="mx-1 mb-2 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1">
        <Search className="h-3 w-3 text-[var(--color-text-tertiary)]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files…" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[var(--color-text-tertiary)]" />
        {query && <button onClick={() => setQuery('')}><X className="h-3 w-3 text-[var(--color-text-tertiary)]" /></button>}
        <button onClick={() => void load()} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"><RefreshCw className="h-3 w-3" /></button>
      </div>

      {!activeWorkspaceId && <div className="px-3 py-4 text-[12px] text-[var(--color-text-tertiary)]">Open a workspace to explore files.</div>}
      {activeWorkspaceId && loading && <div className="space-y-1 px-3 py-2">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-4 animate-pulse rounded bg-[var(--color-bg-muted)]" />)}</div>}
      {error && <div className="mx-2 rounded border border-[var(--color-error)]/40 bg-[var(--color-error-subtle)] p-2 text-[12px] text-[var(--color-error)]">{error}</div>}
      {!loading && visibleNodes.map((node) => <TreeNode key={node.path} node={node} onRefresh={load} />)}
      {!loading && activeWorkspaceId && visibleNodes.length === 0 && <div className="px-3 py-4 text-[12px] text-[var(--color-text-tertiary)]">No files match your search.</div>}
    </div>
  );
}
