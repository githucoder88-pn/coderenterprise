/**
 * Prompt Template Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptTemplateService } from '../../../conversations/engine/prompt-templates.js';
import { createMockLogger } from '../../helpers.js';
import type { ICacheService } from '../../../infrastructure/redis/cache.js';

function createMockCache(): ICacheService {
  return {
    get: vi.fn(async () => null), set: vi.fn(async () => {}), del: vi.fn(async () => {}),
    delPattern: vi.fn(async () => 0), getOrSet: vi.fn(async (_k: string, f: () => Promise<any>) => f()),
    increment: vi.fn(async () => 0), has: vi.fn(async () => false), ttl: vi.fn(async () => 300),
    flushNamespace: vi.fn(async () => 0),
  };
}

describe('PromptTemplateService', () => {
  let service: PromptTemplateService;

  beforeEach(() => {
    service = new PromptTemplateService(createMockCache(), createMockLogger());
  });

  describe('create', () => {
    it('should create a template', async () => {
      const template = await service.create({
        organizationId: 'org-1', name: 'Code Review', description: 'Review code for issues',
        template: 'Review the following {{language}} code:\n\n{{code}}',
        variables: [
          { name: 'language', description: 'Programming language', type: 'string', required: true, defaultValue: null, validation: null },
          { name: 'code', description: 'The code to review', type: 'string', required: true, defaultValue: null, validation: null },
        ],
        category: 'development', tags: ['code', 'review'], isPublic: true, metadata: {},
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Code Review');
      expect(template.version).toBe(1);
    });
  });

  describe('render', () => {
    it('should render a template with variables', async () => {
      const template = await service.create({
        organizationId: 'org-1', name: 'Greeting', description: 'Say hello',
        template: 'Hello, {{name}}! Welcome to {{project}}.',
        variables: [
          { name: 'name', type: 'string', required: true, description: '', defaultValue: null, validation: null },
          { name: 'project', type: 'string', required: false, description: '', defaultValue: 'CODER', validation: null },
        ],
        category: 'general', tags: [], isPublic: false, metadata: {},
      });

      const rendered = await service.render(template.id, { name: 'Alice', project: 'MyApp' });
      expect(rendered).toBe('Hello, Alice! Welcome to MyApp.');
    });

    it('should use default values', async () => {
      const template = await service.create({
        organizationId: 'org-1', name: 'Default Test', description: '',
        template: 'Project: {{project}}',
        variables: [{ name: 'project', type: 'string', required: false, description: '', defaultValue: 'DefaultProject', validation: null }],
        category: 'general', tags: [], isPublic: false, metadata: {},
      });

      const rendered = await service.render(template.id, {});
      expect(rendered).toBe('Project: DefaultProject');
    });

    it('should reject missing required variables', async () => {
      const template = await service.create({
        organizationId: 'org-1', name: 'Required Test', description: '',
        template: '{{required_var}}',
        variables: [{ name: 'required_var', type: 'string', required: true, description: '', defaultValue: null, validation: null }],
        category: 'general', tags: [], isPublic: false, metadata: {},
      });

      await expect(service.render(template.id, {})).rejects.toThrow('required');
    });

    it('should increment usage count', async () => {
      const template = await service.create({
        organizationId: 'org-1', name: 'Counter Test', description: '',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string', required: false, description: '', defaultValue: 'World', validation: null }],
        category: 'general', tags: [], isPublic: false, metadata: {},
      });

      await service.render(template.id, { name: 'A' });
      await service.render(template.id, { name: 'B' });

      const updated = await service.get(template.id);
      expect(updated!.usageCount).toBe(2);
    });
  });

  describe('validateVariables', () => {
    it('should validate with regex pattern', async () => {
      const template = await service.create({
        organizationId: 'org-1', name: 'Validate Test', description: '',
        template: '{{email}}',
        variables: [{ name: 'email', type: 'string', required: true, description: '', defaultValue: null, validation: '^.+@.+$' }],
        category: 'general', tags: [], isPublic: false, metadata: {},
      });

      expect(service.validateVariables(template.id, { email: 'test@example.com' }).valid).toBe(true);
      expect(service.validateVariables(template.id, { email: 'invalid' }).valid).toBe(false);
      expect(service.validateVariables(template.id, {}).valid).toBe(false);
    });
  });

  describe('search', () => {
    it('should search by name', async () => {
      await service.create({ organizationId: 'org-1', name: 'Code Review Helper', description: '', template: 'test', variables: [], category: 'dev', tags: ['code'], isPublic: false, metadata: {} });
      await service.create({ organizationId: 'org-1', name: 'Email Writer', description: '', template: 'test', variables: [], category: 'writing', tags: ['email'], isPublic: false, metadata: {} });

      const results = await service.search('org-1', 'code');
      expect(results.length).toBe(1);
      expect(results[0]!.name).toBe('Code Review Helper');
    });
  });

  describe('fork', () => {
    it('should fork a template', async () => {
      const original = await service.create({
        organizationId: 'org-1', name: 'Original', description: 'Original template',
        template: 'Hello {{name}}', variables: [], category: 'general', tags: [], isPublic: true, metadata: {},
      });

      const forked = await service.fork(original.id, 'org-2');
      expect(forked.name).toBe('Original (fork)');
      expect(forked.organizationId).toBe('org-2');
      expect(forked.id).not.toBe(original.id);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      await service.create({ organizationId: 'org-1', name: 'A', description: '', template: '', variables: [], category: 'dev', tags: [], isPublic: false, metadata: {} });
      await service.create({ organizationId: 'org-1', name: 'B', description: '', template: '', variables: [], category: 'writing', tags: [], isPublic: false, metadata: {} });
      await service.create({ organizationId: 'org-1', name: 'C', description: '', template: '', variables: [], category: 'dev', tags: [], isPublic: false, metadata: {} });

      const categories = await service.getCategories('org-1');
      expect(categories.length).toBe(2);
      expect(categories).toContain('dev');
      expect(categories).toContain('writing');
    });
  });
});
