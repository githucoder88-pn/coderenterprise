/**
 * API Client — Communicates with CODER backend
 */

import * as vscode from 'vscode';

interface ApiOptions {
  method?: string;
  body?: unknown;
  stream?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;
  private disposables: vscode.Disposable[] = [];

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  updateConfig(baseUrl: string, apiKey: string): void {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
    };
  }

  async request<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: this.headers(),
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as any;
      throw new Error(data?.error?.message ?? `API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.data ?? data;
  }

  async *stream(path: string, body: unknown): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) throw new Error(`Stream error: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.delta?.content) yield parsed.delta.content;
              else if (parsed.type === 'content' && parsed.delta) yield parsed.delta;
            } catch { /* skip */ }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Typed endpoints
  async getConversations(page = 1) { return this.request<any>(`/conversations?page=${page}`); }
  async getMessages(id: string) { return this.request<any>(`/conversations/${id}/messages`); }
  async createConversation(body: any) { return this.request<any>('/conversations', { method: 'POST', body }); }
  async sendMessage(id: string, body: any) { return this.request<any>(`/conversations/${id}/send`, { method: 'POST', body }); }
  streamMessage(id: string, body: any) { return this.stream(`/conversations/${id}/send/stream`, body); }

  async getModels(params?: Record<string, string>) { return this.request<any>(`/tools/models?${new URLSearchParams(params ?? {})}`); }
  async syncModels() { return this.request<any>('/tools/models/sync', { method: 'POST' }); }
  async getProviders() { return this.request<any>('/providers'); }
  async getProviderStats() { return this.request<any>('/providers/stats'); }

  async getTools(category?: string) { return this.request<any>(`/tools?category=${category ?? ''}`); }
  async executeTool(id: string, input: any) { return this.request<any>(`/tools/${id}/execute`, { method: 'POST', body: { input } }); }

  async indexWorkspace(id: string) { return this.request<any>('/workspace/index', { method: 'POST', body: { workspaceId: id } }); }
  async searchWorkspace(body: any) { return this.request<any>('/workspace/search', { method: 'POST', body }); }

  async storeMemory(body: any) { return this.request<any>('/conversations/memory', { method: 'POST', body }); }
  async searchMemory(q: string) { return this.request<any>(`/conversations/memory?q=${q}`); }

  async getUsage() { return this.request<any>('/billing-analytics/usage'); }
  async getHealth() { return this.request<any>('/health'); }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
