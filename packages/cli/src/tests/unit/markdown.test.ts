/**
 * Markdown Renderer Tests
 */

import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../ui/markdown.js';

describe('renderMarkdown', () => {
  it('should render headers', () => {
    const result = renderMarkdown('# Title\n## Subtitle\n### Section');
    expect(result).toContain('Title');
    expect(result).toContain('Subtitle');
    expect(result).toContain('Section');
  });

  it('should render bold text', () => {
    const result = renderMarkdown('**bold text**');
    expect(result).toContain('bold text');
  });

  it('should render inline code', () => {
    const result = renderMarkdown('use `console.log` here');
    expect(result).toContain('console.log');
  });

  it('should render lists', () => {
    const result = renderMarkdown('- item 1\n- item 2');
    expect(result).toContain('item 1');
    expect(result).toContain('item 2');
  });

  it('should handle empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('should render links', () => {
    const result = renderMarkdown('[Google](https://google.com)');
    expect(result).toContain('Google');
  });
});
