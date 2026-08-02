/**
 * Diff Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiffEngine } from '../../../workspace/diff/diff-engine.js';

describe('DiffEngine', () => {
  let engine: DiffEngine;

  beforeEach(() => {
    engine = new DiffEngine();
  });

  describe('diff', () => {
    it('should detect no changes', () => {
      const content = 'line 1\nline 2\nline 3';
      const result = engine.diff(content, content);
      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.hunks.length).toBe(0);
    });

    it('should detect additions', () => {
      const old = 'line 1\nline 2';
      const updated = 'line 1\nline 2\nline 3';
      const result = engine.diff(old, updated);
      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(0);
    });

    it('should detect deletions', () => {
      const old = 'line 1\nline 2\nline 3';
      const updated = 'line 1\nline 3';
      const result = engine.diff(old, updated);
      expect(result.deletions).toBe(1);
    });

    it('should detect modifications', () => {
      const old = 'hello world';
      const updated = 'hello universe';
      const result = engine.diff(old, updated);
      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(1);
    });

    it('should handle empty files', () => {
      const result = engine.diff('', 'new content');
      expect(result.additions).toBeGreaterThan(0);
    });

    it('should handle complete replacement', () => {
      const result = engine.diff('old', 'new');
      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(1);
    });
  });

  describe('toUnifiedDiff', () => {
    it('should produce git-style unified diff', () => {
      const old = 'line 1\nline 2\nline 3';
      const updated = 'line 1\nmodified\nline 3';
      const diff = engine.diff(old, updated);
      const unified = engine.toUnifiedDiff(diff);

      expect(unified).toContain('---');
      expect(unified).toContain('+++');
      expect(unified).toContain('@@');
      expect(unified).toContain('-line 2');
      expect(unified).toContain('+modified');
    });
  });

  describe('applyDiff', () => {
    it('should detect hunks correctly', () => {
      const old = 'line 1\nline 2';
      const updated = 'line 1\nline 2\nline 3';
      const diff = engine.diff(old, updated);

      expect(diff.additions).toBe(1);
      expect(diff.hunks.length).toBeGreaterThan(0);
      expect(diff.hunks.some((h) => h.changes.some((c) => c.type === 'add'))).toBe(true);
    });

    it('should detect deletion hunks', () => {
      const old = 'line 1\nline 2\nline 3';
      const updated = 'line 1\nline 3';
      const diff = engine.diff(old, updated);

      expect(diff.deletions).toBe(1);
      expect(diff.hunks.some((h) => h.changes.some((c) => c.type === 'remove'))).toBe(true);
    });
  });

  describe('stats', () => {
    it('should compute diff stats', () => {
      const diff = engine.diff('a\nb', 'a\nc\nd');
      const stats = engine.stats(diff);

      expect(stats.files).toBe(1);
      expect(stats.additions).toBeGreaterThan(0);
    });
  });
});
