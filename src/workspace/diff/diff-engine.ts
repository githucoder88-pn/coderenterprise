/**
 * Diff Engine
 *
 * Line-by-line diff generation using the Myers algorithm (simplified).
 * Produces unified diff format with hunks.
 */

import type { FileDiff, DiffHunk, DiffChange } from '../types.js';

interface DiffLine {
  readonly type: 'add' | 'remove' | 'unchanged';
  readonly oldLine: number | null;
  readonly newLine: number | null;
  readonly content: string;
}

export class DiffEngine {
  /**
   * Generate a diff between two strings.
   */
  diff(oldContent: string, newContent: string, oldPath = 'a/file', newPath = 'b/file'): FileDiff {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const diffLines = this.computeDiff(oldLines, newLines);
    const hunks = this.createHunks(diffLines, 3);
    const additions = diffLines.filter((l) => l.type === 'add').length;
    const deletions = diffLines.filter((l) => l.type === 'remove').length;

    return {
      oldPath, newPath,
      oldHash: this.hashContent(oldContent),
      newHash: this.hashContent(newContent),
      hunks, additions, deletions,
      isBinary: false,
    };
  }

  /**
   * Generate a unified diff string (git-style).
   */
  toUnifiedDiff(diff: FileDiff): string {
    const lines: string[] = [
      `--- ${diff.oldPath}`,
      `+++ ${diff.newPath}`,
    ];

    for (const hunk of diff.hunks) {
      lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
      for (const change of hunk.changes) {
        const prefix = change.type === 'add' ? '+' : change.type === 'remove' ? '-' : ' ';
        lines.push(`${prefix}${change.content}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Apply a diff to old content to produce new content.
   */
  applyDiff(oldContent: string, diff: FileDiff): { content: string; success: boolean; conflicts: readonly number[] } {
    const oldLines = oldContent.split('\n');
    const result: string[] = [];
    const conflicts: number[] = [];
    let oldIdx = 0;

    for (const hunk of diff.hunks) {
      // Copy unchanged lines before hunk
      while (oldIdx < hunk.oldStart - 1 && oldIdx < oldLines.length) {
        result.push(oldLines[oldIdx]!);
        oldIdx++;
      }

      // Apply changes
      for (const change of hunk.changes) {
        if (change.type === 'unchanged') {
          if (oldIdx < oldLines.length && oldLines[oldIdx] === change.content) {
            result.push(change.content);
            oldIdx++;
          } else {
            conflicts.push(hunk.oldStart);
          }
        } else if (change.type === 'remove') {
          if (oldIdx < oldLines.length && oldLines[oldIdx] === change.content) {
            oldIdx++;
          } else {
            conflicts.push(hunk.oldStart);
          }
        } else if (change.type === 'add') {
          result.push(change.content);
        }
      }
    }

    // Copy remaining lines
    while (oldIdx < oldLines.length) {
      result.push(oldLines[oldIdx]!);
      oldIdx++;
    }

    return { content: result.join('\n'), success: conflicts.length === 0, conflicts };
  }

  /**
   * Compute diff stats.
   */
  stats(diff: FileDiff): { additions: number; deletions: number; files: number; hunks: number } {
    return {
      additions: diff.additions,
      deletions: diff.deletions,
      files: 1,
      hunks: diff.hunks.length,
    };
  }

  // ─── Myers Algorithm (simplified) ────────────────────────────────────────

  private computeDiff(oldLines: readonly string[], newLines: readonly string[]): DiffLine[] {
    const result: DiffLine[] = [];
    const lcs = this.lcs(oldLines, newLines);

    let oi = 0, ni = 0, li = 0;

    while (oi < oldLines.length || ni < newLines.length) {
      if (li < lcs.length && oi < oldLines.length && ni < newLines.length &&
          oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
        result.push({ type: 'unchanged', oldLine: oi + 1, newLine: ni + 1, content: oldLines[oi]! });
        oi++; ni++; li++;
      } else if (oi < oldLines.length && (li >= lcs.length || oldLines[oi] !== lcs[li])) {
        result.push({ type: 'remove', oldLine: oi + 1, newLine: null, content: oldLines[oi]! });
        oi++;
      } else if (ni < newLines.length) {
        result.push({ type: 'add', oldLine: null, newLine: ni + 1, content: newLines[ni]! });
        ni++;
      }
    }

    return result;
  }

  private lcs(a: readonly string[], b: readonly string[]): string[] {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }

    // Backtrack
    const result: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift(a[i - 1]!);
        i--; j--;
      } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
        i--;
      } else {
        j--;
      }
    }

    return result;
  }

  private createHunks(lines: readonly DiffLine[], context: number): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let i = 0;

    while (i < lines.length) {
      // Find start of a change
      if (lines[i]!.type === 'unchanged') { i++; continue; }

      const hunkStart = Math.max(0, i - context);
      const changes: DiffChange[] = [];
      let oldStart = 0, newStart = 0, oldLines = 0, newLines = 0;

      // Gather context + changes
      let j = hunkStart;
      while (j < lines.length) {
        const line = lines[j]!;

        if (line.type === 'unchanged' && j > i + context && this.isChangeEnd(lines, j, context)) {
          // Add trailing context
          for (let k = j; k < Math.min(j + context, lines.length); k++) {
            if (lines[k]!.type === 'unchanged') {
              changes.push({ type: 'unchanged', line: lines[k]!.oldLine ?? 0, content: lines[k]!.content, oldLine: lines[k]!.oldLine ?? undefined, newLine: lines[k]!.newLine ?? undefined });
              oldLines++; newLines++;
            }
          }
          break;
        }

        if (line.type === 'unchanged') {
          changes.push({ type: 'unchanged', line: line.oldLine ?? 0, content: line.content, oldLine: line.oldLine ?? undefined, newLine: line.newLine ?? undefined });
          if (j < i) { oldStart = line.oldLine ?? 0; newStart = line.newLine ?? 0; }
          oldLines++; newLines++;
        } else if (line.type === 'remove') {
          if (changes.length === 0 || changes.every((c) => c.type === 'unchanged')) {
            oldStart = line.oldLine ?? 0;
            newStart = line.newLine ?? (lines[j + 1]?.newLine ?? 0);
          }
          changes.push({ type: 'remove', line: line.oldLine ?? 0, content: line.content, oldLine: line.oldLine ?? undefined });
          oldLines++;
        } else if (line.type === 'add') {
          changes.push({ type: 'add', line: line.newLine ?? 0, content: line.content, newLine: line.newLine ?? undefined });
          newLines++;
        }

        j++;
      }

      if (changes.some((c) => c.type !== 'unchanged')) {
        hunks.push({ oldStart, oldLines, newStart, newLines, content: changes.map((c) => c.content).join('\n'), changes });
      }

      i = j;
    }

    return hunks;
  }

  private isChangeEnd(lines: readonly DiffLine[], idx: number, context: number): boolean {
    for (let k = idx; k < Math.min(idx + context, lines.length); k++) {
      if (lines[k]!.type !== 'unchanged') return false;
    }
    return true;
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 1000); i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }
}
