/**
 * Terminal table renderer
 */

import chalk from 'chalk';

export function table(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxRow = rows.reduce((max, row) => Math.max(max, stripAnsi(row[i] ?? '').length), 0);
    return Math.max(stripAnsi(h).length, maxRow) + 2;
  });

  const sep = colWidths.map((w) => '─'.repeat(w)).join('┼');
  const headerRow = headers.map((h, i) => chalk.bold(h.padEnd(colWidths[i]!))).join(' │ ');

  const dataRows = rows.map((row) =>
    row.map((cell, i) => (cell ?? '').padEnd(colWidths[i]!)).join(' │ '),
  );

  return `\n  ${headerRow}\n  ${sep}\n  ${dataRows.join('\n  ')}\n`;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}
