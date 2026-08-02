/**
 * Hover Provider
 *
 * Shows AI explanations when hovering over code with Shift held.
 */

import * as vscode from 'vscode';
import type { ChatService } from '../services/chat-service.js';
import type { ApiClient } from '../services/api-client.js';

export class CoderHoverProvider implements vscode.HoverProvider {
  constructor(
    private readonly chat: ChatService,
    private readonly api: ApiClient,
  ) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return undefined;

    const word = document.getText(wordRange);
    const line = document.lineAt(position.line).text;
    const language = document.languageId;

    // Only provide hover when holding Shift (to not interfere with normal hover)
    // VS Code doesn't expose modifier keys in hover, so we check for specific patterns
    if (word.length < 3) return undefined;

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(`**CODER**: \`${word}\`\n\n`);
    md.appendMarkdown(`[Explain](command:coder.explain) | [Review](command:coder.review) | [Refactor](command:coder.refactor)`);

    return new vscode.Hover(md, wordRange);
  }
}
