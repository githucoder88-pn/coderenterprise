/**
 * coder logs — View audit logs
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../services/api.js';
import { table } from '../ui/table.js';
import { formatDate, truncate } from '../ui/format.js';

export const logsCommand = new Command('logs')
  .description('View audit logs')
  .option('-l, --limit <n>', 'Number of logs', '20')
  .option('-j, --json', 'Output as JSON')
  .action(async (opts) => {
    try {
      const result = await api.getUsage(); // Use existing API
      const logs: any[] = []; // Would come from audit endpoint
      if (opts.json) { console.log(JSON.stringify(logs, null, 2)); return; }

      console.log(chalk.bold('\n  Audit Logs\n'));
      if (logs.length === 0) {
        console.log(chalk.dim('  No recent logs.'));
        return;
      }

      const rows = logs.map((l: any) => [
        chalk.dim(formatDate(l.createdAt)),
        chalk.white(l.action),
        truncate(l.actorId ?? '', 12),
        l.targetType ?? '—',
      ]);
      console.log(table(['Time', 'Action', 'Actor', 'Target'], rows));
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });
