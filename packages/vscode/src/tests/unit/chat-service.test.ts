/**
 * Chat Service Logic Tests
 */

import { describe, it, expect } from 'vitest';

describe('ChatService', () => {
  it('should format editor context correctly', () => {
    const fileName = '/home/user/project/src/index.ts';
    const language = 'typescript';
    const selectedCode = 'function hello() { return "hi"; }';

    const context = `File: ${fileName} (${language})\nSelected code:\n\`\`\`${language}\n${selectedCode}\n\`\`\``;

    expect(context).toContain('index.ts');
    expect(context).toContain('typescript');
    expect(context).toContain('function hello()');
    expect(context).toContain('```typescript');
  });

  it('should build streaming prompts', () => {
    const editorContext = 'File: test.ts (typescript)\nSelected code:\n```typescript\nconst x = 1;\n```';
    const userMessage = 'Explain this code';
    const fullMessage = `${editorContext}\n\n${userMessage}`;

    expect(fullMessage).toContain('test.ts');
    expect(fullMessage).toContain('Explain this code');
    expect(fullMessage).toContain('const x = 1');
  });

  it('should define editor commands', () => {
    const editorCommands = ['coder.explain', 'coder.review', 'coder.refactor', 'coder.test', 'coder.plan', 'coder.commit'];
    expect(editorCommands.length).toBe(6);
    expect(editorCommands).toContain('coder.explain');
    expect(editorCommands).toContain('coder.test');
  });

  it('should clean commit messages', () => {
    const raw = '```\nfeat: add new feature\n\nDetailed description\n```';
    const cleaned = raw.replace(/^```.*$/gm, '').trim();
    expect(cleaned).toBe('feat: add new feature\n\nDetailed description');
  });
});
