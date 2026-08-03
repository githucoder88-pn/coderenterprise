/**
 * Prompt Template Service
 *
 * Versioned prompt templates with variable interpolation, categories, and ratings.
 */

import type { PromptTemplate } from './types.js';

export interface IPromptTemplateService {
  create(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'usageCount' | 'rating'>): Promise<PromptTemplate>;
  get(id: string): Promise<PromptTemplate | null>;
  getBySlug(orgId: string, name: string): Promise<PromptTemplate | null>;
  list(orgId: string, category?: string): Promise<readonly PromptTemplate[]>;
  listPublic(category?: string): Promise<readonly PromptTemplate[]>;
  update(id: string, updates: Partial<Pick<PromptTemplate, 'template' | 'description' | 'variables' | 'tags'>>): Promise<PromptTemplate>;
  delete(id: string): Promise<void>;
  render(id: string, variables: Record<string, unknown>): Promise<string>;
  validateVariables(id: string, variables: Record<string, unknown>): { valid: boolean; errors: readonly string[] };
  rate(id: string, rating: number): Promise<void>;
  fork(id: string, orgId: string): Promise<PromptTemplate>;
  search(orgId: string, query: string): Promise<readonly PromptTemplate[]>;
  getCategories(orgId: string): Promise<readonly string[]>;
}

export class PromptTemplateService implements IPromptTemplateService {
  private readonly templates = new Map<string, PromptTemplate>();

  constructor(
  ) {}

  async create(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'usageCount' | 'rating'>): Promise<PromptTemplate> {
    const id = crypto.randomUUID();
    const now = new Date();
    const t: PromptTemplate = {
      ...template, id, version: 1, usageCount: 0, rating: 0,
      createdAt: now, updatedAt: now,
    };
    this.templates.set(id, t);
    return t;
  }

  async get(id: string): Promise<PromptTemplate | null> {
    return this.templates.get(id) ?? null;
  }

  async getBySlug(orgId: string, name: string): Promise<PromptTemplate | null> {
    return [...this.templates.values()].find(
      (t) => t.organizationId === orgId && t.name === name,
    ) ?? null;
  }

  async list(orgId: string, category?: string): Promise<readonly PromptTemplate[]> {
    return [...this.templates.values()]
      .filter((t) => t.organizationId === orgId && (!category || t.category === category))
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  async listPublic(category?: string): Promise<readonly PromptTemplate[]> {
    return [...this.templates.values()]
      .filter((t) => t.isPublic && (!category || t.category === category))
      .sort((a, b) => b.rating - a.rating);
  }

  async update(id: string, updates: Partial<Pick<PromptTemplate, 'template' | 'description' | 'variables' | 'tags'>>): Promise<PromptTemplate> {
    const existing = this.templates.get(id);
    if (!existing) throw new Error('Template not found');
    const updated = { ...existing, ...updates, version: existing.version + 1, updatedAt: new Date() };
    this.templates.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.templates.delete(id);
  }

  async render(id: string, variables: Record<string, unknown>): Promise<string> {
    const template = this.templates.get(id);
    if (!template) throw new Error('Template not found');

    const validation = this.validateVariables(id, variables);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.errors.join(', ')}`);

    let rendered = template.template;

    // Build defaults map
    const defaults: Record<string, string> = {};
    for (const v of template.variables) {
      if (v.defaultValue !== null) defaults[v.name] = v.defaultValue;
    }

    // Replace {{variable}} and {{variable|default}} placeholders
    rendered = rendered.replace(/\{\{(\w+)(?:\|([^}]+))?\}\}/g, (_match, name, pipeDefault) => {
      const value = variables[name] ?? pipeDefault ?? defaults[name] ?? '';
      return String(value);
    });

    // Update usage count
    this.templates.set(id, { ...template, usageCount: template.usageCount + 1, updatedAt: new Date() });

    return rendered;
  }

  validateVariables(id: string, variables: Record<string, unknown>): { valid: boolean; errors: readonly string[] } {
    const template = this.templates.get(id);
    if (!template) return { valid: false, errors: ['Template not found'] };

    const errors: string[] = [];
    for (const v of template.variables) {
      const value = variables[v.name];
      if (v.required && (value === undefined || value === null || value === '')) {
        errors.push(`Variable '${v.name}' is required`);
      }
      if (v.validation && value !== undefined) {
        try {
          const regex = new RegExp(v.validation);
          if (!regex.test(String(value))) {
            errors.push(`Variable '${v.name}' does not match pattern: ${v.validation}`);
          }
        } catch { /* invalid regex, skip */ }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async rate(id: string, rating: number): Promise<void> {
    const template = this.templates.get(id);
    if (!template) return;
    // Weighted average
    const totalRatings = template.usageCount;
    const newRating = (template.rating * totalRatings + rating) / (totalRatings + 1);
    this.templates.set(id, { ...template, rating: newRating, updatedAt: new Date() });
  }

  async fork(id: string, orgId: string): Promise<PromptTemplate> {
    const original = this.templates.get(id);
    if (!original) throw new Error('Template not found');

    const forkId = crypto.randomUUID();
    const now = new Date();
    const forked: PromptTemplate = {
      ...original, id: forkId, organizationId: orgId,
      name: `${original.name} (fork)`, version: 1, usageCount: 0, rating: 0,
      metadata: { ...original.metadata, forkedFrom: id },
      createdAt: now, updatedAt: now,
    };

    this.templates.set(forkId, forked);
    return forked;
  }

  async search(orgId: string, query: string): Promise<readonly PromptTemplate[]> {
    const q = query.toLowerCase();
    return [...this.templates.values()]
      .filter((t) =>
        t.organizationId === orgId &&
        (t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) ||
         t.tags.some((tag) => tag.toLowerCase().includes(q))),
      )
      .sort((a, b) => b.rating - a.rating);
  }

  async getCategories(orgId: string): Promise<readonly string[]> {
    const categories = new Set<string>();
    for (const t of this.templates.values()) {
      if (t.organizationId === orgId && t.category) categories.add(t.category);
    }
    return [...categories].sort();
  }
}
