/**
 * Editor Commands — Explain, Review, Refactor, Test, Commit
 */

import * as vscode from 'vscode';
import type { ChatService } from '../services/chat-service.js';
import type { ApiClient } from '../services/api-client.js';

function getSelectedCode(): { code: string; language: string; fileName: string } | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;
  const selection = editor.selection;
  const code = editor.document.getText(selection.isEmpty ? undefined : selection);
  return { code, language: editor.document.languageId, fileName: editor.document.fileName };
}

async function askCoder(prompt: string, chat: ChatService, api: ApiClient): Promise<string> {
  return chat.sendSync(prompt);
}

async function showResponse(title: string, response: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content: response, language: 'markdown' });
  vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
}

export function registerEditorCommands(context: vscode.ExtensionContext, chat: ChatService, api: ApiClient): void {
  // coder.explain
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.explain', async () => {
      const ctx = getSelectedCode();
      if (!ctx) { vscode.window.showWarningMessage('No code selected'); return; }
      const response = await askCoder(`Explain this ${ctx.language} code from ${ctx.fileName}:\n\`\`\`${ctx.language}\n${ctx.code}\n\`\`\``, chat, api);
      showResponse('CODER: Explain', response);
    }),
  );

  // coder.review
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.review', async () => {
      const ctx = getSelectedCode();
      if (!ctx) { vscode.window.showWarningMessage('No code selected'); return; }
      const response = await askCoder(`Review this ${ctx.language} code for bugs, security issues, and improvements:\n\`\`\`${ctx.language}\n${ctx.code}\n\`\`\``, chat, api);
      showResponse('CODER: Review', response);
    }),
  );

  // coder.refactor
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.refactor', async () => {
      const ctx = getSelectedCode();
      if (!ctx) { vscode.window.showWarningMessage('No code selected'); return; }
      const response = await askCoder(`Refactor this ${ctx.language} code for better readability, performance, and maintainability:\n\`\`\`${ctx.language}\n${ctx.code}\n\`\`\``, chat, api);
      showResponse('CODER: Refactor', response);
    }),
  );

  // coder.test
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.test', async () => {
      const ctx = getSelectedCode();
      if (!ctx) { vscode.window.showWarningMessage('No code selected'); return; }
      const response = await askCoder(`Generate comprehensive unit tests for this ${ctx.language} code:\n\`\`\`${ctx.language}\n${ctx.code}\n\`\`\``, chat, api);
      showResponse('CODER: Tests', response);
    }),
  );

  // coder.plan
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.plan', async () => {
      const ctx = getSelectedCode();
      const task = await vscode.window.showInputBox({ prompt: 'Describe the task', placeHolder: 'What do you want to build?' });
      if (!task) return;
      const contextStr = ctx ? `\nCurrent code:\n\`\`\`${ctx.language}\n${ctx.code}\n\`\`\`` : '';
      const response = await askCoder(`Create a detailed implementation plan for: ${task}${contextStr}`, chat, api);
      showResponse('CODER: Plan', response);
    }),
  );

  // coder.commit
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.commit', async () => {
      const response = await askCoder('Generate a conventional commit message for the current changes. Only output the commit message.', chat, api);
      const cleaned = response.replace(/^```.*$/gm, '').trim();
      const action = await vscode.window.showInformationMessage(`Commit message:\n${cleaned}`, 'Copy', 'Use in SCM');
      if (action === 'Copy') vscode.env.clipboard.writeText(cleaned);
    }),
  );
}
