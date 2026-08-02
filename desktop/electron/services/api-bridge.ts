/**
 * API Bridge
 *
 * HTTP client for communicating with the CODER backend.
 */

import { db } from './database.js';

class ApiBridge {
  private baseUrl = 'http://localhost:3000/api/v1';

  constructor() {
    const savedUrl = db.getSetting('apiUrl', '');
    if (savedUrl) this.baseUrl = savedUrl;
  }

  private getHeaders(): Record<string, string> {
    const apiKey = db.getSetting('apiKey', '');
    return {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    };
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = params ? `${this.baseUrl}${path}?${new URLSearchParams(params)}` : `${this.baseUrl}${path}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    const data = await res.json() as any;
    return data.data ?? data;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    const data = await res.json() as any;
    return data.data ?? data;
  }

  async stream(path: string, body: unknown): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
  }

  setUrl(url: string): void {
    this.baseUrl = url;
    db.setSetting('apiUrl', url);
  }

  setApiKey(key: string): void {
    db.setSetting('apiKey', key);
  }
}

export const apiBridge = new ApiBridge();
