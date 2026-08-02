/**
 * Editor Provider Registration
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';
import type { ChatService } from '../services/chat-service.js';
import { CoderInlineCompletionProvider } from './inline-completion.js';
import { CoderHoverProvider } from './hover-provider.js';
import { CoderCodeActionProvider } from './code-action.js';

export function registerProviders(context: vscode.ExtensionContext, services: { apiClient: ApiClient; chat: ChatService }): void {
  const config = vscode.workspace.getConfiguration('coder');

  // Inline completions
  if (config.get<boolean>('inlineCompletions', true)) {
    context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' },
        new CoderInlineCompletionProvider(services.apiClient),
      ),
    );
  }

  // Hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { pattern: '**' },
      new CoderHoverProvider(services.chat, services.apiClient),
    ),
  );

  // Code action provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { pattern: '**' },
      new CoderCodeActionProvider(services.chat, services.apiClient),
      { providedCodeActionKinds: [vscode.CodeActionKind.Refactor, vscode.CodeActionKind.QuickFix] },
    ),
  );
}
