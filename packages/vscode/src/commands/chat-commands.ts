/**
 * Chat Commands
 */

import * as vscode from 'vscode';
import type { ChatService } from '../services/chat-service.js';
import type { ApiClient } from '../services/api-client.js';

export function registerChatCommands(context: vscode.ExtensionContext, chat: ChatService, api: ApiClient): void {
  // coder.chat
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.chat', async () => {
      const editor = vscode.window.activeTextEditor;
      const editorContext = chat.getEditorContext();

      const message = await vscode.window.showInputBox({
        prompt: 'Ask CODER',
        placeHolder: 'What would you like to do?',
        ...(editorContext ? { value: `Regarding ${editor?.document.fileName}: ` } : {}),
      });

      if (!message) return;

      const fullMessage = editorContext ? `${editorContext}\n\n${message}` : message;

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'CODER is thinking…' },
        async (progress) => {
          let dots = 0;
          const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            progress.report({ message: '.'.repeat(dots) });
          }, 500);

          try {
            await chat.sendStreaming(
              fullMessage,
              () => {},
              (response) => {
                clearInterval(interval);
                // Show response in output or webview
                const panel = vscode.window.createOutputChannel('CODER Chat');
                panel.appendLine(`\n--- You ---\n${message}\n\n--- CODER ---\n${response}`);
                panel.show();
              },
            );
          } catch (error) {
            clearInterval(interval);
            vscode.window.showErrorMessage(`CODER error: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
      );
    }),
  );

  // coder.history
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.history', async () => {
      const history = chat.getHistory();
      if (history.length === 0) {
        vscode.window.showInformationMessage('No conversation history');
        return;
      }
      const items = history.map((m) => ({
        label: m.role === 'user' ? `$(person) ${m.content.slice(0, 80)}` : `$(robot) ${m.content.slice(0, 80)}`,
        description: m.timestamp.toLocaleTimeString(),
      }));
      await vscode.window.showQuickPick(items, { placeHolder: 'Conversation History' });
    }),
  );
}
