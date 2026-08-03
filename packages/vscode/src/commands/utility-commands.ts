/**
 * Utility Commands — Providers, Models, Settings
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';
import type { AuthService } from '../authentication/auth-service.js';
import type { ChatService } from '../services/chat-service.js';
import type { WorkspaceService } from '../workspace/workspace-service.js';
import type { LogService } from '../services/log-service.js';

interface Services {
  apiClient: ApiClient;
  auth: AuthService;
  chat: ChatService;
  workspace: WorkspaceService;
  logs: LogService;
}

export function registerUtilityCommands(context: vscode.ExtensionContext, services: Services): void {
  // coder.providers
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.providers', async () => {
      const providers = await services.apiClient.getProviders();
      const items: vscode.QuickPickItem[] = (providers ?? []).map((p: any) => ({
        label: p.name,
        description: p.capabilities?.streaming ? 'Streaming' : '',
        detail: `Tools: ${p.capabilities?.toolCalling ? '✓' : '—'} | Vision: ${p.capabilities?.vision ? '✓' : '—'}`,
      }));
      const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select provider' });
      if (selected) {
        vscode.workspace.getConfiguration('coder').update('defaultProvider', selected.label, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Default provider: ${selected.label}`);
      }
    }),
  );

  // coder.models
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.models', async () => {
      const models = await services.apiClient.getModels();
      const items: vscode.QuickPickItem[] = (models ?? []).map((m: any) => ({
        label: m.displayName ?? m.name,
        description: m.provider,
        detail: `Context: ${(m.contextWindow / 1000).toFixed(0)}K | ${m.pricing ? `$${m.pricing.inputPerMillion}/$${m.pricing.outputPerMillion}` : '—'}`,
      }));
      const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select model' });
      if (selected) {
        vscode.workspace.getConfiguration('coder').update('defaultModel', selected.label, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Default model: ${selected.label}`);
      }
    }),
  );

  // coder.settings
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.settings', async () => {
      const items = [
        { label: '$(gear) Open Settings', command: 'workbench.action.openSettings', args: 'coder' },
        { label: '$(sign-in) Sign In', command: 'coder.providers' },
        { label: '$(database) Index Workspace', command: 'coder.workspace.index' },
        { label: '$(refresh) Sync Models', action: async () => { await services.apiClient.syncModels(); vscode.window.showInformationMessage('Models synced'); } },
        { label: '$(output) Show Logs', action: () => services.logs.show() },
      ];
      const selected = await vscode.window.showQuickPick(items, { placeHolder: 'CODER Settings' });
      if (selected) {
        if ('command' in selected && selected.command) {
          vscode.commands.executeCommand(selected.command, ...((selected as any).args ? [(selected as any).args] : []));
        } else if ('action' in selected) {
          await (selected as any).action();
        }
      }
    }),
  );
}
