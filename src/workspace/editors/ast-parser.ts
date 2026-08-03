/**
 * AST Parser
 *
 * Language-aware code parsing using regex-based extraction.
 * Extracts symbols (functions, classes, interfaces, types, imports, exports)
 * for 10 languages.
 */

import type { SupportedLanguage, AstSymbol, ParseResult } from '../types.js';


const FUNCTION_PATTERNS: Record<SupportedLanguage, RegExp> = {
  typescript: /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/gm,
  javascript: /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/gm,
  python: /(?:def|async\s+def)\s+(\w+)\s*\(/gm,
  rust: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/gm,
  go: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/gm,
  java: /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+(?:\s*,\s*\w+)*)?\s*\{/gm,
  c: /(?:static\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{/gm,
  cpp: /(?:static\s+|virtual\s+|inline\s+)?(?:\w+[\s*&]+)+(\w+)\s*\([^)]*\)\s*(?:const\s*)?(?:override\s*)?\{/gm,
  csharp: /(?:public|private|protected|internal)?\s*(?:static\s+)?(?:virtual\s+|override\s+|async\s+)?(?:\w+[\s<>\w,?\s]*[\s*&]+)+(\w+)\s*\([^)]*\)\s*\{/gm,
  kotlin: /(?:fun)\s+(?:suspend\s+)?(\w+)\s*\(/gm,
};

const CLASS_PATTERNS: Record<SupportedLanguage, RegExp> = {
  typescript: /(?:export\s+)?(?:abstract\s+)?(?:class|interface|type|enum)\s+(\w+)/gm,
  javascript: /(?:export\s+)?(?:class)\s+(\w+)/gm,
  python: /(?:class)\s+(\w+)(?:\([^)]*\))?\s*:/gm,
  rust: /(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/gm,
  go: /(?:type)\s+(\w+)\s+(?:struct|interface)\s*\{/gm,
  java: /(?:public|private|protected)?\s*(?:abstract\s+)?(?:class|interface|enum)\s+(\w+)/gm,
  c: /(?:typedef\s+)?(?:struct|enum)\s+(\w+)/gm,
  cpp: /(?:class|struct|enum\s+class?)\s+(\w+)/gm,
  csharp: /(?:public|private|protected|internal)?\s*(?:abstract\s+|sealed\s+|static\s+)?(?:class|interface|struct|enum)\s+(\w+)/gm,
  kotlin: /(?:class|interface|object|enum\s+class|data\s+class|sealed\s+class)\s+(\w+)/gm,
};

const IMPORT_PATTERNS: Record<SupportedLanguage, RegExp> = {
  typescript: /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/gm,
  javascript: /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/gm,
  python: /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/gm,
  rust: /(?:use|extern\s+crate)\s+([^;]+)/gm,
  go: /import\s+(?:(\w+)\s+)?["]([^"]+)["]/gm,
  java: /import\s+(?:static\s+)?([^;]+)/gm,
  c: /#include\s+[<"]([^>"]+)[>"]/gm,
  cpp: /#include\s+[<"]([^>"]+)[>"]/gm,
  csharp: /using\s+([^;]+)/gm,
  kotlin: /import\s+([^;\n]+)/gm,
};

export class AstParser {
  /**
   * Parse a file and extract symbols.
   */
  parse(content: string, language: SupportedLanguage, filePath: string): ParseResult {
    const symbols: AstSymbol[] = [];
    const imports: { source: string; specifiers: readonly string[]; isDefault: boolean }[] = [];
    const errors: ParseResult['errors'] = [];
    const lines = content.split('\n');

    // Extract functions
    this.extractWithPattern(content, FUNCTION_PATTERNS[language]!, (match, lineNum) => {
      const name = match[1] ?? match[2] ?? '';
      if (name) {
        symbols.push({
          name, kind: 'function', language, filePath,
          startLine: lineNum, endLine: this.findBlockEnd(lines, lineNum),
          docstring: this.extractDocstring(lines, lineNum, language),
          returnType: this.extractReturnType(match[0], language),
          parameters: this.extractParameters(match[0], language),
          modifiers: this.extractModifiers(match[0]),
          children: [],
        });
      }
    });

    // Extract classes/interfaces/types
    this.extractWithPattern(content, CLASS_PATTERNS[language]!, (match, lineNum) => {
      const name = match[1] ?? '';
      if (name) {
        const kind = this.classifyClassKind(match[0], language);
        symbols.push({
          name, kind, language, filePath,
          startLine: lineNum, endLine: this.findBlockEnd(lines, lineNum),
          docstring: this.extractDocstring(lines, lineNum, language),
          returnType: null, parameters: [],
          modifiers: this.extractModifiers(match[0]),
          children: [],
        });
      }
    });

    // Extract imports
    this.extractWithPattern(content, IMPORT_PATTERNS[language]!, (match) => {
      const source = match[3] ?? match[1] ?? match[0].replace(/import\s+/, '').replace(/from\s+/, '');
      const specifiers = (match[1] ?? match[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      imports.push({
        source: source.replace(/['"]/g, ''),
        specifiers,
        isDefault: !!match[2] && !match[1],
      });
    });

    // Extract exports
    const exports = this.extractExports(content, language);

    return { symbols, imports, exports, errors, lineCount: lines.length };
  }

  /**
   * Parse multiple files (batch).
   */
  parseBatch(files: readonly { content: string; language: SupportedLanguage; path: string }[]): readonly ParseResult[] {
    return files.map((f) => this.parse(f.content, f.language, f.path));
  }

  /**
   * Extract a specific symbol by name.
   */
  findSymbol(content: string, language: SupportedLanguage, filePath: string, name: string): AstSymbol | null {
    const result = this.parse(content, language, filePath);
    const direct = result.symbols.find((s) => s.name === name);
    if (direct) return direct;

    // Search in children
    for (const symbol of result.symbols) {
      const child = symbol.children.find((c) => c.name === name);
      if (child) return child;
    }
    return null;
  }

  /**
   * Extract all symbols of a specific kind.
   */
  findByKind(content: string, language: SupportedLanguage, filePath: string, kind: AstSymbol['kind']): readonly AstSymbol[] {
    const result = this.parse(content, language, filePath);
    return result.symbols.filter((s) => s.kind === kind);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private extractWithPattern(
    content: string, pattern: RegExp, callback: (match: RegExpExecArray, lineNum: number) => void,
  ): void {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const beforeMatch = content.slice(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      callback(match, lineNum);
    }
  }

  private findBlockEnd(lines: readonly string[], startLine: number): number {
    let depth = 0;
    let inBlock = false;
    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i] ?? '';
      for (const ch of line) {
        if (ch === '{') { depth++; inBlock = true; }
        if (ch === '}') { depth--; }
      }
      if (inBlock && depth <= 0) return i + 1;
    }
    // Python-style: find next line with same or less indentation
    const startIndent = (lines[startLine - 1]?.match(/^(\s*)/) ?? ['', ''])[1]!.length;
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (line.trim() === '') continue;
      const indent = (line.match(/^(\s*)/) ?? ['', ''])[1]!.length;
      if (indent <= startIndent && line.trim().length > 0) return i;
    }
    return Math.min(startLine + 50, lines.length);
  }

  private extractDocstring(lines: readonly string[], lineNum: number, language: SupportedLanguage): string | null {
    // Look backwards for a comment block
    const comment = language === 'python' ? '#' : '//';
    const docLines: string[] = [];
    for (let i = lineNum - 2; i >= 0; i--) {
      const line = (lines[i] ?? '').trim();
      if (line.startsWith(comment) || line.startsWith('/**') || line.startsWith('*')) {
        docLines.unshift(line.replace(/^\/\/\s?|^\/\*\*?\s?|\s?\*\/$|^\*\s?/, ''));
      } else if (line === '') {
        continue;
      } else {
        break;
      }
    }
    return docLines.length > 0 ? docLines.join('\n').trim() : null;
  }

  private extractReturnType(signature: string, language: SupportedLanguage): string | null {
    if (language === 'typescript' || language === 'javascript') {
      const match = signature.match(/:\s*(\w[\w<>\[\]?,\s|&]*)/);
      return match?.[1] ?? null;
    }
    if (language === 'rust') {
      const match = signature.match(/->\s*(\w[\w<>]*)/);
      return match?.[1] ?? null;
    }
    if (language === 'go') {
      const match = signature.match(/\)\s*(\w[\w]*)/);
      return match?.[1] ?? null;
    }
    return null;
  }

  private extractParameters(signature: string, _language: SupportedLanguage): { name: string; type: string | null; defaultValue: string | null }[] {
    const paramMatch = signature.match(/\(([^)]*)\)/);
    if (!paramMatch?.[1]) return [];

    return paramMatch[1].split(',').map((p) => {
      const parts = p.trim().split(/[:\s=]+/).filter(Boolean);
      return {
        name: parts[0]?.replace(/self|this|&self|&mut self/, '').trim() ?? '',
        type: parts.length > 1 ? parts[1] ?? null : null,
        defaultValue: parts.length > 2 ? parts.slice(2).join(' ') : null,
      };
    }).filter((p) => p.name.length > 0);
  }

  private extractModifiers(signature: string): string[] {
    const modifiers: string[] = [];
    const keywords = ['public', 'private', 'protected', 'static', 'async', 'abstract', 'virtual', 'override', 'readonly', 'pub', 'export', 'default', 'const', 'final', 'sealed', 'suspend'];
    for (const kw of keywords) {
      if (signature.includes(kw)) modifiers.push(kw);
    }
    return modifiers;
  }

  private classifyClassKind(match: string, language: SupportedLanguage): AstSymbol['kind'] {
    if (match.includes('interface')) return 'interface';
    if (match.includes('enum')) return 'enum';
    if (match.includes('type ') && (language === 'typescript')) return 'type';
    if (match.includes('trait')) return 'interface';
    return 'class';
  }

  private extractExports(content: string, language: SupportedLanguage): ParseResult['exports'] {
    const exports: { name: string; kind: string }[] = [];
    const patterns: RegExp[] = [];

    if (language === 'typescript' || language === 'javascript') {
      patterns.push(
        /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/gm,
        /export\s+{([^}]+)}/gm,
      );
    } else if (language === 'python') {
      patterns.push(/__all__\s*=\s*\[([^\]]+)\]/gm);
    } else if (language === 'rust') {
      patterns.push(/pub\s+(?:fn|struct|enum|trait|type|const|static)\s+(\w+)/gm);
    }

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]?.includes('{')) {
          // Destructured exports
          const names = match[1]!.split(',').map((n) => n.trim().split(/\s+as\s+/)[0]!.trim()).filter(Boolean);
          names.forEach((n) => exports.push({ name: n, kind: 'export' }));
        } else if (match[1]) {
          exports.push({ name: match[1], kind: 'declaration' });
        }
      }
    }

    return exports;
  }
}
