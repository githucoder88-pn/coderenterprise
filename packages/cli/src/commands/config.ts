/**
 * coder config — Configuration management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getAll, set, resetConfig, get } from '../config/store.js';
import { table } from '../ui/table.js';

export const configCommand = new Command('config')
  .description('Manage CLI configuration');

configCommand
  .command('list')
  .description('Show all configuration')
  .action(() => {
    const config = getAll();
    const rows = Object.entries(config).map(([k, v]) => [
      chalk.white(k),
      typeof v === 'boolean' ? (v ? chalk.green('true') : chalk.red('false')) : chalk.dim(String(v ?? '—')),
    ]);
    console.log(table(['Key', 'Value'], rows));
  });

configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action((key, value) => {
    const config = getAll();
    if (!(key in config)) {
      console.error(chalk.red(`Unknown key: ${key}`));
      console.log(chalk.dim(`Valid keys: ${Object.keys(config).join(', ')}`));
      return;
    }

    // Type coercion
    const current = config[key as keyof typeof config];
    let parsed: unknown = value;
    if (typeof current === 'boolean') parsed = value === 'true';
    if (typeof current === 'number') parsed = Number(value);

    set(key as any, parsed as any);
    console.log(chalk.green(`✓ ${key} = ${parsed}`));
  });

configCommand
  .command('reset')
  .description('Reset all configuration to defaults')
  .action(() => {
    resetConfig();
    console.log(chalk.green('✓ Configuration reset to defaults'));
  });
