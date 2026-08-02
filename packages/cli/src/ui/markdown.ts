/**
 * Markdown renderer for terminal output
 */

import chalk from 'chalk';

export function renderMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Headers
    .replace(/^### (.+)$/gm, chalk.bold.cyan('$1'))
    .replace(/^## (.+)$/gm, chalk.bold.blue('$1'))
    .replace(/^# (.+)$/gm, chalk.bold.magenta('$1'))
    // Bold
    .replace(/\*\*(.+?)\*\*/g, chalk.bold('$1'))
    // Italic
    .replace(/\*(.+?)\*/g, chalk.italic('$1'))
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const lines = code.trim().split('\n').map((l: string) => chalk.dim(`  │ ${l}`)).join('\n');
      return `\n${lines}\n`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, chalk.cyan('$1'))
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, chalk.underline.blue('$1') + chalk.dim(' ($2)'))
    // Lists
    .replace(/^[*-] (.+)$/gm, `  ${chalk.dim('•')} $1`)
    .replace(/^\d+\. (.+)$/gm, (match, text) => `  ${match.match(/^\d+/)?.[0]}. ${text}`)
    // Blockquotes
    .replace(/^> (.+)$/gm, chalk.dim(`  │ $1`))
    // Horizontal rules
    .replace(/^---+$/gm, chalk.dim('  ' + '─'.repeat(50)));
}
