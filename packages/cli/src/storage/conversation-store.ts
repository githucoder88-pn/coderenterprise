/**
 * Conversation Store — Local SQLite
 */

import { getDatabase } from './database.js';
import { nanoid } from 'nanoid';

export interface StoredConversation {
  id: string;
  title: string;
  model: string | null;
  provider: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  model: string | null;
  provider: string | null;
  tokens: number;
  created_at: string;
}

export function createConversation(title: string, model?: string, provider?: string): StoredConversation {
  const db = getDatabase();
  const id = nanoid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO conversations (id, title, model, provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, title, model ?? null, provider ?? null, now, now);
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as StoredConversation;
}

export function getConversation(id: string): StoredConversation | undefined {
  return getDatabase().prepare('SELECT * FROM conversations WHERE id = ?').get(id) as StoredConversation | undefined;
}

export function listConversations(limit = 50, offset = 0): StoredConversation[] {
  return getDatabase().prepare('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ? OFFSET ?').all(limit, offset) as StoredConversation[];
}

export function updateConversation(id: string, updates: Partial<Pick<StoredConversation, 'title' | 'model' | 'provider'>>): void {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
  if (updates.model !== undefined) { sets.push('model = ?'); values.push(updates.model); }
  if (updates.provider !== undefined) { sets.push('provider = ?'); values.push(updates.provider); }
  sets.push("updated_at = datetime('now')");
  values.push(id);
  getDatabase().prepare(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteConversation(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
}

export function addMessage(conversationId: string, role: string, content: string, model?: string, provider?: string, tokens = 0): StoredMessage {
  const db = getDatabase();
  const id = nanoid();
  db.prepare('INSERT INTO messages (id, conversation_id, role, content, model, provider, tokens) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, conversationId, role, content, model ?? null, provider ?? null, tokens);
  db.prepare("UPDATE conversations SET message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?").run(conversationId);
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as StoredMessage;
}

export function getMessages(conversationId: string, limit = 100): StoredMessage[] {
  return getDatabase().prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?').all(conversationId, limit) as StoredMessage[];
}

export function searchConversations(query: string): StoredConversation[] {
  return getDatabase().prepare("SELECT * FROM conversations WHERE title LIKE ? ORDER BY updated_at DESC LIMIT 20").all(`%${query}%`) as StoredConversation[];
}
