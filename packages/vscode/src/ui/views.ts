/**
 * Sidebar View Registration
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';
import type { ChatService } from '../services/chat-service.js';
import type { WorkspaceService } from '../workspace/workspace-service.js';
import type { LogService } from '../services/log-service.js';
import { ConversationTreeProvider } from './conversation-tree.js';
import { ModelTreeProvider } from './model-tree.js';
import { ProviderTreeProvider } from './provider-tree.js';
import { ToolTreeProvider } from './tool-tree.js';

interface Services {
  apiClient: ApiClient;
  chat: ChatService;
  workspace: WorkspaceService;
  logs: LogService;
}

export function registerViews(context: vscode.ExtensionContext, services: Services): void {
  // Conversations
  const conversations = new ConversationTreeProvider(services.apiClient, services.chat);
  vscode.window.registerTreeDataProvider('coder.conversations', conversations);

  // Models
  const models = new ModelTreeProvider(services.apiClient);
  vscode.window.registerTreeDataProvider('coder.models', models);

  // Providers
  const providers = new ProviderTreeProvider(services.apiClient);
  vscode.window.registerTreeDataProvider('coder.providers', providers);

  // Tools
  const tools = new ToolTreeProvider(services.apiClient);
  vscode.window.registerTreeDataProvider('coder.tools', tools);

  // Refresh on config change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('coder')) {
        models.refresh();
        providers.refresh();
      }
    }),
  );
}
