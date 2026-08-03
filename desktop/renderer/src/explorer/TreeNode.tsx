import { useState } from 'react';
import { ChevronDown, ChevronRight, File, FileCode, FileJson, FileText, Folder, FolderOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FileManager, type FileNode } from './FileManager';

function iconFor(node: FileNode, expanded: boolean) {
  if (node.isDir) return expanded ? FolderOpen : Folder;
  if (/\.(ts|tsx|js|jsx|css|html)$/.test(node.name)) return FileCode;
  if (/\.(json|ya?ml)$/.test(node.name)) return FileJson;
  if (/\.(md|txt|log)$/.test(node.name)) return FileText;
  return File;
}

const statusClass: Record<string, string> = {
  added: 'text-[var(--color-success)]',
  modified: 'text-[var(--color-warning)]',
  deleted: 'text-[var(--color-error)]',
  untracked: 'text-[var(--color-info)]',
};

export function TreeNode({ node, depth = 0, onRefresh }: { node: FileNode; depth?: number; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(Boolean(node.expanded));
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(node.name);
  const Icon = iconFor(node, expanded);

  const commitRename = async () => {
    setRenaming(false);
    if (!draftName.trim() || draftName === node.name) return;
    const parts = node.path.split('/');
    parts[parts.length - 1] = draftName.trim();
    await FileManager.rename(node.path, parts.join('/')).finally(onRefresh);
  };

  return (
    <div draggable onDragStart={(event) => event.dataTransfer.setData('text/coder-file-path', node.path)} onDragOver={(event) => node.isDir && event.preventDefault()} onDrop={(event) => {
      const sourcePath = event.dataTransfer.getData('text/coder-file-path');
      if (sourcePath && node.isDir && sourcePath !== node.path) void FileManager.move(sourcePath, `${node.path}/${sourcePath.split('/').at(-1)}`).finally(onRefresh);
    }}>
      <div
        className="group flex h-6 w-full items-center gap-1.5 pr-2 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button onClick={() => node.isDir ? setExpanded(!expanded) : void FileManager.open(node.path)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          {node.isDir && (expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />)}
          {!node.isDir && <span className="w-3 shrink-0" />}
          <Icon className={cn('h-3.5 w-3.5 shrink-0', node.gitStatus && statusClass[node.gitStatus])} />
          {renaming ? (
            <input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} onBlur={commitRename} onKeyDown={(event) => { if (event.key === 'Enter') void commitRename(); if (event.key === 'Escape') setRenaming(false); }} className="min-w-0 flex-1 rounded bg-[var(--color-bg)] px-1 py-0.5 outline outline-1 outline-[var(--color-brand)]" />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </button>
        <button onClick={() => setRenaming(true)} className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]">rename</button>
      </div>
      {expanded && node.children?.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} onRefresh={onRefresh} />)}
    </div>
  );
}
