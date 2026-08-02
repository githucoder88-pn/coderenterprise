/**
 * Provider Tree View
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';

export class ProviderTreeProvider implements vscode.TreeDataProvider<ProviderItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ProviderItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly api: ApiClient) {}

  refresh(): void { this._onDidChangeTreeData.fire(undefined); }

  getTreeItem(element: ProviderItem): vscode.TreeItem { return element; }

  async getChildren(element?: ProviderItem): Promise<ProviderItem[]> {
    if (element) return [];
    try {
      const providers = await this.api.getProviders();
      return (providers ?? []).map((p: any) => {
        const item = new ProviderItem(
          p.name,
          p.capabilities?.streaming ? 'Streaming' : '',
          vscode.TreeItemCollapsibleState.None,
        );
        item.iconPath = new vscode.ThemeIcon('server');
        return item;
      });
    } catch {
      return [];
    }
  }
}

class ProviderItem extends vscode.TreeItem {
  constructor(label: string, description: string, state: vscode.TreeItemCollapsibleState) {
    super(label, state);
    this.description = description;
  }
}
