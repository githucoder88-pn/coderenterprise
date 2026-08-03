/**
 * VS Code Extension Entry Point
 *
 * Registers all commands, providers, views, and event handlers.
 */

import * as vscode from 'vscode';
import { ApiClient } from './services/api-client.js';
import { AuthService } from './authentication/auth-service.js';
import { ChatService } from './services/chat-service.js';
import { WorkspaceService } from './workspace/workspace-service.js';
import { registerCommands } from './commands/index.js';
import { registerProviders } from './providers/index.js';
import { registerViews } from './ui/views.js';
import { LogService } from './services/log-service.js';

let apiClient: ApiClient;

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('coder');
  const apiUrl = config.get<string>('apiUrl', 'http://localhost:3000/api/v1');
  const apiKey = (await context.secrets.get('coder.apiKey')) ?? config.get<string>('apiKey', '');

  // Initialize core services
  apiClient = new ApiClient(apiUrl, apiKey);
  const auth = new AuthService(apiClient, context.secrets);
  const chat = new ChatService(apiClient, context);
  const workspace = new WorkspaceService(apiClient);
  const logs = new LogService();

  // Register everything
  registerCommands(context, { apiClient, auth, chat, workspace, logs });
  registerProviders(context, { apiClient, chat });
  registerViews(context, { apiClient, chat, workspace, logs });

  // Status bar
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '$(comment-discussion) CODER';
  statusBar.tooltip = 'Open CODER Chat';
  statusBar.command = 'coder.chat';
  statusBar.show();
  context.subscriptions.push(statusBar);

  console.log('CODER extension activated');
}

export function deactivate() {
  apiClient?.dispose();
}
