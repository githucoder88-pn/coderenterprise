/**
 * Authentication Service
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../services/api-client.js';

export class AuthService {
  private authenticated = false;
  private currentUser: any = null;

  constructor(
    private readonly api: ApiClient,
    private readonly secrets: vscode.SecretStorage,
  ) {}

  async login(): Promise<boolean> {
    const method = await vscode.window.showQuickPick(
      [
        { label: 'API Key', description: 'Authenticate with an API key', value: 'apikey' },
        { label: 'Email & Password', description: 'Sign in with credentials', value: 'email' },
      ],
      { placeHolder: 'Select authentication method' },
    );

    if (!method) return false;

    if (method.value === 'apikey') {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your CODER API key',
        password: true,
        placeHolder: 'ce_...',
      });
      if (!key) return false;

      await this.secrets.store('coder.apiKey', key);
      this.api.updateConfig(this.api['baseUrl'], key);
    } else {
      const email = await vscode.window.showInputBox({ prompt: 'Email', placeHolder: 'user@example.com' });
      const password = await vscode.window.showInputBox({ prompt: 'Password', password: true });
      if (!email || !password) return false;

      try {
        const result = await this.api.request<any>('/auth/sign-in', {
          method: 'POST',
          body: { email, password },
        });
        if (result.tokens?.accessToken) {
          await this.secrets.store('coder.apiKey', result.tokens.accessToken);
          this.api.updateConfig(this.api['baseUrl'], result.tokens.accessToken);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }
    }

    this.authenticated = true;
    vscode.window.showInformationMessage('Signed in to CODER');
    return true;
  }

  async logout(): Promise<void> {
    await this.secrets.delete('coder.apiKey');
    this.authenticated = false;
    this.currentUser = null;
    vscode.window.showInformationMessage('Signed out of CODER');
  }

  isAuthenticated(): boolean { return this.authenticated; }
  getCurrentUser(): any { return this.currentUser; }
}
