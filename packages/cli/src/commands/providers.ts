/**
 * coder providers — Provider management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';
import { table } from '../ui/table.js';
import { set } from '../config/store.js';

export const providersCommand = new Command('providers')
  .description('Manage AI providers');

providersCommand
  .command('list')
  .description('List connected providers')
  .option('-j, --json', 'Output as JSON')
  .action(async (opts) => {
    const spinner = ora('Fetching providers…').start();
    try {
      const [providers, stats] = await Promise.all([api.getProviders(), api.getProviderStats()]);
      spinner.stop();

      if (opts.json) {
        console.log(JSON.stringify({ providers, stats }, null, 2));
        return;
      }

      const rows = (providers ?? []).map((p: any) => {
        const stat = (stats ?? []).find((s: any) => s.name === p.name);
        return [
          chalk.white.bold(p.name),
          p.capabilities?.streaming ? chalk.green('✓') : chalk.dim('—'),
          p.capabilities?.toolCalling ? chalk.green('✓') : chalk.dim('—'),
          p.capabilities?.vision ? chalk.green('✓') : chalk.dim('—'),
          stat ? (stat.circuitState === 'closed' ? chalk.green('healthy') : chalk.yellow(stat.circuitState)) : chalk.dim('—'),
        ];
      });

      console.log(table(['Provider', 'Stream', 'Tools', 'Vision', 'Status'], rows));
    } catch (error) {
      spinner.fail('Failed to fetch providers');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

providersCommand
  .command('sync')
  .description('Sync models from all providers')
  .action(async () => {
    const spinner = ora('Syncing all providers…').start();
    try {
      const result = await api.syncModels();
      spinner.succeed(`Sync complete: ${result.added} added, ${result.updated} updated`);
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

providersCommand
  .command('set-default <provider>')
  .description('Set default provider')
  .action(async (provider) => {
    set('defaultProvider', provider);
    console.log(chalk.green(`✓ Default provider set to ${provider}`));
  });
