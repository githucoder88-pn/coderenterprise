import { EditorManager } from '../editor/EditorManager';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
  expanded?: boolean;
  gitStatus?: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'ignored' | 'clean';
}

function normalizeNode(input: unknown, parentPath = ''): FileNode | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const name = String(record.name ?? record.basename ?? record.fileName ?? '').trim();
  const path = String(record.path ?? (parentPath && name ? `${parentPath}/${name}` : name)).trim();
  if (!name && !path) return null;
  const childrenInput = Array.isArray(record.children) ? record.children : [];
  const type = String(record.type ?? '').toLowerCase();
  const explicitDirectory = record.isDir ?? record.directory ?? record.isDirectory;
  const isDir = explicitDirectory === undefined ? type === 'directory' || childrenInput.length > 0 : Boolean(explicitDirectory);
  return {
    id: path || name,
    name: name || path.split('/').at(-1) || path,
    path: path || name,
    isDir,
    gitStatus: record.gitStatus as FileNode['gitStatus'],
    children: childrenInput.map((child) => normalizeNode(child, path)).filter(Boolean) as FileNode[],
  };
}

function normalizeTree(response: unknown): FileNode[] {
  const candidate = Array.isArray(response)
    ? response
    : Array.isArray((response as Record<string, unknown> | null)?.files)
      ? (response as Record<string, unknown>).files as unknown[]
      : Array.isArray((response as Record<string, unknown> | null)?.data)
        ? (response as Record<string, unknown>).data as unknown[]
        : [];
  return candidate.map((item) => normalizeNode(item)).filter(Boolean) as FileNode[];
}

export class FileManager {
  static async list(workspaceId: string): Promise<FileNode[]> {
    const response = await window.coder.workspace.getFiles(workspaceId);
    return normalizeTree(response);
  }

  static async open(path: string): Promise<void> {
    await EditorManager.openFile(path);
  }

  static async rename(path: string, nextPath: string): Promise<void> {
    await window.coder.tool.execute('workspace.rename', { path, nextPath });
  }

  static async copy(path: string, targetPath: string): Promise<void> {
    await window.coder.tool.execute('workspace.copy', { path, targetPath });
  }

  static async move(path: string, targetPath: string): Promise<void> {
    await window.coder.tool.execute('workspace.move', { path, targetPath });
  }

  static async delete(path: string): Promise<void> {
    await window.coder.tool.execute('workspace.delete', { path });
  }
}
