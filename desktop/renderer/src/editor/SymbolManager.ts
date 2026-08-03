import { useEditorStore, type WorkspaceSymbol } from './EditorStore';

const SYMBOL_PATTERNS: Array<{ kind: string; pattern: RegExp }> = [
  { kind: 'class', pattern: /\b(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g },
  { kind: 'function', pattern: /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g },
  { kind: 'component', pattern: /\b(?:export\s+)?const\s+([A-Z][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g },
  { kind: 'method', pattern: /\b([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*{/g },
  { kind: 'type', pattern: /\b(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/g },
];

export class SymbolManager {
  static refresh(path: string, content: string): WorkspaceSymbol[] {
    const symbols: WorkspaceSymbol[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      for (const { kind, pattern } of SYMBOL_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match?.[1]) {
          symbols.push({ name: match[1], kind, path, line: index + 1, column: match.index + 1 });
          break;
        }
      }
    });

    useEditorStore.getState().setSymbols(path, symbols);
    return symbols;
  }

  static workspaceSymbols(query = ''): WorkspaceSymbol[] {
    const normalized = query.toLowerCase();
    return Object.values(useEditorStore.getState().symbols)
      .flat()
      .filter((symbol) => !normalized || symbol.name.toLowerCase().includes(normalized) || symbol.path.toLowerCase().includes(normalized));
  }
}
