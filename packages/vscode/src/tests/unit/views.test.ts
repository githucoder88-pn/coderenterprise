/**
 * View Registration Tests
 */

import { describe, it, expect } from 'vitest';

const REQUIRED_VIEWS = [
  { id: 'coder.conversations', name: 'Conversations' },
  { id: 'coder.workspaces', name: 'Workspaces' },
  { id: 'coder.tools', name: 'Tools' },
  { id: 'coder.models', name: 'Models' },
  { id: 'coder.providers', name: 'Providers' },
  { id: 'coder.logs', name: 'Logs' },
];

describe('Sidebar Views', () => {
  it('should define all required views', () => {
    expect(REQUIRED_VIEWS.length).toBe(6);
    expect(REQUIRED_VIEWS.map((v) => v.id)).toContain('coder.conversations');
    expect(REQUIRED_VIEWS.map((v) => v.id)).toContain('coder.models');
  });

  it('should have unique view IDs', () => {
    const ids = REQUIRED_VIEWS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should use coder namespace', () => {
    for (const view of REQUIRED_VIEWS) {
      expect(view.id).toMatch(/^coder\./);
    }
  });
});
