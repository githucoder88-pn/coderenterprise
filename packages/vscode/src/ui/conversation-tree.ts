/**
 * Conversation Tree View
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';
import type { ChatService } from '../services/chat-service.js';

export class ConversationTreeProvider implements vscode.TreeDataProvider<ConversationItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ConversationItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly api: ApiClient,
    private readonly chat: ChatService,
  ) {}

  refresh(): void { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: ConversationItem): vscode.TreeItem { return element; }

  async getChildren(element?: ConversationItem): Promise<ConversationItem[]> {
    if (element) return [];
    try {
      const result = await this.api.getConversations();
      const conversations = result?.data ?? result ?? [];
      return conversations.map((c: any) => {
        const item = new ConversationItem(
          c.title ?? 'Untitled',
          `${c.model} · ${c.messageCount ?? 0} messages`,
          vscode.TreeItemCollapsibleState.None,
        );
        item.command = {
          command: 'coder.chat',
          title: 'Open',
          arguments: [],
        };
        item.contextValue = 'conversation';
        return item;
      });
    } catch {
      return [];
    }
  }
}

class ConversationItem extends vscode.TreeItem {
  constructor(label: string, description: string, state: vscode.TreeItemCollapsibleState) {
    super(label, state);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon('comment-discussion');
  }
}
