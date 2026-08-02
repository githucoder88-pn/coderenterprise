/**
 * Workspace Commands — Index, Search, Memory, Tools
 */

import * as vscode from 'vscode';
import type { WorkspaceService } from '../workspace/workspace-service.js';
import type { ApiClient } from '../services/api-client.js';

export function registerWorkspaceCommands(context: vscode.ExtensionContext, workspace: WorkspaceService, api: ApiClient): void {
  // coder.workspace.index
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.workspace.index', async () => {
      await workspace.index();
    }),
  );

  // coder.workspace.search
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.workspace.search', async () => {
      const query = await vscode.window.showInputBox({ prompt: 'Search workspace', placeHolder: 'Semantic search query…' });
      if (!query) return;
      const results = await workspace.search(query);
      const items = results.map((r: any) => ({
        label: r.filePath,
        description: `Line ${r.line} [${r.engine}]`,
        detail: r.match?.trim()?.slice(0, 100),
      }));
      const selected = await vscode.window.showQuickPick(items, { placeHolder: `${results.length} results` });
      if (selected) {
        const doc = await vscode.workspace.openTextDocument(selected.label);
        await vscode.window.showTextDocument(doc);
      }
    }),
  );

  // coder.memory.store
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.memory.store', async () => {
      const content = await vscode.window.showInputBox({ prompt: 'Store in memory', placeHolder: 'What should CODER remember?' });
      if (!content) return;
      await api.storeMemory({ content, type: 'long_term', importance: 70 });
      vscode.window.showInformationMessage('Memory stored');
    }),
  );

  // coder.memory.search
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.memory.search', async () => {
      const query = await vscode.window.showInputBox({ prompt: 'Search memory', placeHolder: 'Search your memories…' });
      if (!query) return;
      const results = await api.searchMemory(query);
      const items = (results ?? []).map((m: any) => ({
        label: m.content.slice(0, 80),
        description: `${m.type} (importance: ${m.importance})`,
      }));
      await vscode.window.showQuickPick(items, { placeHolder: 'Memory results' });
    }),
  );

  // coder.tools.list
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.tools.list', async () => {
      const tools = await api.getTools();
      const items = (tools ?? []).map((t: any) => ({
        label: t.name,
        description: t.category,
        detail: t.description,
      }));
      await vscode.window.showQuickPick(items, { placeHolder: 'Available Tools' });
    }),
  );

  // coder.tools.execute
  context.subscriptions.push(
    vscode.commands.registerCommand('coder.tools.execute', async () => {
      const tools = await api.getTools();
      const items = (tools ?? []).map((t: any) => ({
        label: t.name,
        description: t.id,
      }));
      const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select tool to execute' });
      if (!selected) return;
      const input = await vscode.window.showInputBox({ prompt: 'Tool input (JSON)', placeHolder: '{}' });
      if (!input) return;
      try {
        const result = await api.executeTool(selected.description, JSON.parse(input));
        const output = JSON.stringify(result.output ?? result, null, 2);
        const doc = await vscode.workspace.openTextDocument({ content: output, language: 'json' });
        vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
      } catch (error) {
        vscode.window.showErrorMessage(`Tool error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
  );
}
