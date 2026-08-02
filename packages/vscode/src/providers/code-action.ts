/**
 * Code Action Provider
 *
 * Provides AI-powered quick fixes and refactor suggestions.
 */

import * as vscode from 'vscode';
import type { ChatService } from '../services/chat-service.js';
import type { ApiClient } from '../services/api-client.js';

export class CoderCodeActionProvider implements vscode.CodeActionProvider {
  constructor(
    private readonly chat: ChatService,
    private readonly api: ApiClient,
  ) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const selectedCode = document.getText(range);

    if (!selectedCode || selectedCode.length < 5) return actions;

    // Explain
    const explain = new vscode.CodeAction('CODER: Explain this code', vscode.CodeActionKind.Empty);
    explain.command = { command: 'coder.explain', title: 'Explain' };
    actions.push(explain);

    // Review
    const review = new vscode.CodeAction('CODER: Review for issues', vscode.CodeActionKind.QuickFix);
    review.command = { command: 'coder.review', title: 'Review' };
    actions.push(review);

    // Refactor
    const refactor = new vscode.CodeAction('CODER: Refactor', vscode.CodeActionKind.Refactor);
    refactor.command = { command: 'coder.refactor', title: 'Refactor' };
    actions.push(refactor);

    // Generate tests
    const test = new vscode.CodeAction('CODER: Generate tests', vscode.CodeActionKind.Empty);
    test.command = { command: 'coder.test', title: 'Generate Tests' };
    actions.push(test);

    // Diagnostic-based quick fixes
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
        const fix = new vscode.CodeAction(`CODER: Fix: ${diagnostic.message.slice(0, 50)}`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.command = {
          command: 'coder.chat',
          title: 'Fix',
          arguments: [`Fix this error: ${diagnostic.message}\n\nCode:\n\`\`\`${document.languageId}\n${document.getText(diagnostic.range)}\n\`\`\``],
        };
        actions.push(fix);
      }
    }

    return actions;
  }
}
