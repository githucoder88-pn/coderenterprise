/**
 * Model Tree View
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';

export class ModelTreeProvider implements vscode.TreeDataProvider<ModelItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ModelItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly api: ApiClient) {}

  refresh(): void { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: ModelItem): vscode.TreeItem { return element; }

  async getChildren(element?: ModelItem): Promise<ModelItem[]> {
    if (element) return [];
    try {
      const models = await this.api.getModels();
      return (models ?? []).slice(0, 50).map((m: any) => {
        const item = new ModelItem(
          m.displayName ?? m.name,
          `${m.provider} · ${(m.contextWindow / 1000).toFixed(0)}K`,
          vscode.TreeItemCollapsibleState.None,
        );
        item.command = {
          command: 'workbench.action.openSettings',
          title: 'Set as default',
          arguments: ['coder.defaultModel'],
        };
        return item;
      });
    } catch {
      return [];
    }
  }
}

class ModelItem extends vscode.TreeItem {
  constructor(label: string, description: string, state: vscode.TreeItemCollapsibleState) {
    super(label, state);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon('cpu');
  }
}
