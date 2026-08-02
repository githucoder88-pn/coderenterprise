/**
 * Chat Service — Manages conversations and streaming
 */

import * as vscode from 'vscode';
import type { ApiClient } from './api-client.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  conversationId?: string;
}

export class ChatService {
  private currentConversationId: string | null = null;
  private messageHistory: ChatMessage[] = [];
  private _onMessage = new vscode.EventEmitter<ChatMessage>();
  readonly onMessage = this._onMessage.event;

  constructor(
    private readonly api: ApiClient,
    private readonly context: vscode.ExtensionContext,
  ) {}

  async createConversation(model?: string, provider?: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('coder');
    const conv = await this.api.createConversation({
      workspaceId: 'vscode',
      model: model ?? config.get<string>('defaultModel') ?? 'gpt-4o',
      provider: provider ?? config.get<string>('defaultProvider') ?? 'openai',
    });
    this.currentConversationId = conv.id;
    return conv.id;
  }

  async sendStreaming(message: string, onChunk: (chunk: string) => void, onComplete: (full: string) => void): Promise<void> {
    if (!this.currentConversationId) {
      await this.createConversation();
    }

    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date(), conversationId: this.currentConversationId! };
    this.messageHistory.push(userMsg);
    this._onMessage.fire(userMsg);

    let fullResponse = '';
    try {
      for await (const chunk of this.api.streamMessage(this.currentConversationId!, { content: message })) {
        fullResponse += chunk;
        onChunk(chunk);
      }
    } catch (error) {
      fullResponse += `\n\nError: ${error instanceof Error ? error.message : String(error)}`;
    }

    const assistantMsg: ChatMessage = { role: 'assistant', content: fullResponse, timestamp: new Date(), conversationId: this.currentConversationId! };
    this.messageHistory.push(assistantMsg);
    this._onMessage.fire(assistantMsg);
    onComplete(fullResponse);
  }

  async sendSync(message: string): Promise<string> {
    if (!this.currentConversationId) await this.createConversation();
    const result = await this.api.sendMessage(this.currentConversationId!, { content: message });
    const response = result.response ?? result.content ?? '';
    this.messageHistory.push({ role: 'user', content: message, timestamp: new Date() });
    this.messageHistory.push({ role: 'assistant', content: response, timestamp: new Date() });
    return response;
  }

  getHistory(): readonly ChatMessage[] { return this.messageHistory; }
  getCurrentConversationId(): string | null { return this.currentConversationId; }
  switchConversation(id: string): void { this.currentConversationId = id; }

  getEditorContext(): string {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return '';
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    const fileName = editor.document.fileName;
    const language = editor.document.languageId;
    return `File: ${fileName} (${language})\n${selectedText ? `Selected code:\n\`\`\`${language}\n${selectedText}\n\`\`\`` : ''}`;
  }
}
