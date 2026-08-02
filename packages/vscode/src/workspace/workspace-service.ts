/**
 * Workspace Service — Indexing, search, git integration
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';

export class WorkspaceService {
  constructor(private readonly api: ApiClient) {}

  async index(): Promise<void> {
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Indexing workspace…' }, async () => {
      const result = await this.api.indexWorkspace('vscode');
      vscode.window.showInformationMessage(`Indexed: ${result.totalFiles ?? 0} files, ${result.totalSymbols ?? 0} symbols`);
    });
  }

  async search(query: string, engine = 'hybrid'): Promise<any[]> {
    const result = await this.api.searchWorkspace({ query, engine, workspaceId: 'vscode', maxResults: 50 });
    return result?.results ?? [];
  }

  async getWorkspaceFiles(): Promise<any[]> {
    try {
      const result = await this.api.request<any>('/workspace/files?workspaceId=vscode&recursive=true');
      return result ?? [];
    } catch { return []; }
  }

  getFileContext(): { fileName: string; languageId: string; content: string; selection: string } | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    return {
      fileName: editor.document.fileName,
      languageId: editor.document.languageId,
      content: editor.document.getText(),
      selection: editor.document.getText(editor.selection),
    };
  }
}
