/**
 * Tool Tree View
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';

export class ToolTreeProvider implements vscode.TreeDataProvider<ToolItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ToolItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly api: ApiClient) {}

  refresh(): void { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: ToolItem): vscode.TreeItem { return element; }

  async getChildren(element?: ToolItem): Promise<ToolItem[]> {
    if (element) return [];
    try {
      const tools = await this.api.getTools();
      return (tools ?? []).map((t: any) => {
        const item = new ToolItem(t.name, t.category, vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon('tools');
        item.command = {
          command: 'coder.tools.execute',
          title: 'Execute',
          arguments: [],
        };
        return item;
      });
    } catch {
      return [];
    }
  }
}

class ToolItem extends vscode.TreeItem {
  constructor(label: string, description: string, state: vscode.TreeItemCollapsibleState) {
    super(label, state);
    this.description = description;
  }
}
