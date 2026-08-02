/**
 * Log Service — Output channel for extension logging
 */

import * as vscode from 'vscode';

export class LogService {
  private readonly channel: vscode.OutputChannel;

  constructor() {
    this.channel = vscode.window.createOutputChannel('CODER');
  }

  info(message: string): void { this.channel.appendLine(`[INFO] ${message}`); }
  warn(message: string): void { this.channel.appendLine(`[WARN] ${message}`); }
  error(message: string): void { this.channel.appendLine(`[ERROR] ${message}`); }
  debug(message: string): void { this.channel.appendLine(`[DEBUG] ${message}`); }
  show(): void { this.channel.show(); }
  dispose(): void { this.channel.dispose(); }
}
