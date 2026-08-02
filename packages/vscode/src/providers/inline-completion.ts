/**
 * Inline Completion Provider
 *
 * Provides AI-powered code completions as ghost text.
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';

export class CoderInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastRequest = '';

  constructor(private readonly api: ApiClient) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    // Skip on triggered by user explicitly selecting
    if (context.triggerKind === vscode.InlineCompletionTriggerKind.Explicit) return undefined;

    const linePrefix = document.getText(new vscode.Range(new vscode.Position(Math.max(0, position.line - 5), 0), position));
    const lineSuffix = document.getText(new vscode.Range(position, new vscode.Position(Math.min(document.lineCount - 1, position.line + 5), 0)));

    // Don't complete on empty lines or very short prefixes
    if (linePrefix.trim().length < 3) return undefined;

    try {
      const response = await this.api.sendMessage('inline-completion', {
        content: `Complete this code. Only output the completion, no explanations.\n\nPrefix:\n${linePrefix}\n\nSuffix:\n${lineSuffix}`,
        model: undefined,
        provider: undefined,
      });

      const completion = (response.response ?? response.content ?? '').replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim();
      if (!completion || completion.length < 2) return undefined;

      return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
    } catch {
      return undefined;
    }
  }
}
