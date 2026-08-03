/**
 * Local SQLite Database
 *
 * Stores conversations, settings, cache, workspace metadata.
 */

import Database from 'better-sqlite3';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { app } from 'electron';

class LocalDatabase {
  private db: Database.Database;

  constructor() {
    const dataDir = join(app.getPath('userData'), 'data');
    mkdirSync(dataDir, { recursive: true });
    this.db = new Database(join(dataDir, 'coder.db'));
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT, model TEXT, provider TEXT, message_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, tokens INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT, path TEXT, last_indexed TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at TEXT, created_at TEXT DEFAULT (datetime('now')));
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    `);
  }

  // Settings
  getSetting<T>(key: string, defaultValue: T): T {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : defaultValue;
  }

  setSetting(key: string, value: unknown): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))').run(key, JSON.stringify(value));
  }

  getSettings(): Record<string, unknown> {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]));
  }

  resetSettings(): void {
    this.db.prepare('DELETE FROM settings').run();
  }

  // Conversations
  getConversations(limit = 50): any[] {
    return this.db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?').all(limit);
  }

  addConversation(id: string, title: string, model?: string, provider?: string): void {
    this.db.prepare('INSERT OR REPLACE INTO conversations (id, title, model, provider) VALUES (?, ?, ?, ?)').run(id, title, model ?? null, provider ?? null);
  }

  getMessages(conversationId: string, limit = 100): any[] {
    return this.db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?').all(conversationId, limit);
  }

  addMessage(id: string, conversationId: string, role: string, content: string, tokens = 0): void {
    this.db.prepare('INSERT INTO messages (id, conversation_id, role, content, tokens) VALUES (?, ?, ?, ?, ?)').run(id, conversationId, role, content, tokens);
    this.db.prepare("UPDATE conversations SET message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?").run(conversationId);
  }

  // Workspaces
  getWorkspaces(): any[] {
    return this.db.prepare('SELECT * FROM workspaces ORDER BY created_at DESC').all();
  }

  addWorkspace(id: string, name: string, path: string): void {
    this.db.prepare('INSERT OR REPLACE INTO workspaces (id, name, path) VALUES (?, ?, ?)').run(id, name, path);
  }

  close(): void {
    this.db.close();
  }
}

export const db = new LocalDatabase();
