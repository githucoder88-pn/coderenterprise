import type { FileNode } from './FileManager';

function score(value: string, query: string): number {
  if (!query) return 1;
  const target = value.toLowerCase();
  const needle = query.toLowerCase();
  if (target === needle) return 100;
  if (target.includes(needle)) return 70 - target.indexOf(needle);
  let position = 0;
  let points = 0;
  for (const char of needle) {
    const found = target.indexOf(char, position);
    if (found === -1) return 0;
    points += Math.max(1, 10 - (found - position));
    position = found + 1;
  }
  return points;
}

export class SearchManager {
  static filter(nodes: FileNode[], query: string): FileNode[] {
    if (!query.trim()) return nodes;
    const visit = (node: FileNode): FileNode | null => {
      const children = node.children?.map(visit).filter(Boolean) as FileNode[] | undefined;
      const matched = score(node.name, query) > 0 || score(node.path, query) > 0;
      if (!matched && (!children || children.length === 0)) return null;
      return { ...node, expanded: true, children };
    };
    return nodes.map(visit).filter(Boolean) as FileNode[];
  }

  static flatten(nodes: FileNode[]): FileNode[] {
    return nodes.flatMap((node) => [node, ...SearchManager.flatten(node.children ?? [])]);
  }
}
