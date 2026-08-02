/**
 * Command Registration
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';
import type { AuthService } from '../authentication/auth-service.js';
import type { ChatService } from '../services/chat-service.js';
import type { WorkspaceService } from '../workspace/workspace-service.js';
import type { LogService } from '../services/log-service.js';
import { registerChatCommands } from './chat-commands.js';
import { registerEditorCommands } from './editor-commands.js';
import { registerWorkspaceCommands } from './workspace-commands.js';
import { registerUtilityCommands } from './utility-commands.js';

interface Services {
  apiClient: ApiClient;
  auth: AuthService;
  chat: ChatService;
  workspace: WorkspaceService;
  logs: LogService;
}

export function registerCommands(context: vscode.ExtensionContext, services: Services): void {
  registerChatCommands(context, services.chat, services.apiClient);
  registerEditorCommands(context, services.chat, services.apiClient);
  registerWorkspaceCommands(context, services.workspace, services.apiClient);
  registerUtilityCommands(context, services);
}
