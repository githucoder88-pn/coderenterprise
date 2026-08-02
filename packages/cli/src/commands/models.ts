/**
 * coder models — Model management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';
import { formatNumber } from '../ui/format.js';
import { table } from '../ui/table.js';
import { set } from '../config/store.js';

export const modelsCommand = new Command('models')
  .description('Manage AI models');

modelsCommand
  .command('list')
  .description('List available models')
  .option('-p, --provider <provider>', 'Filter by provider')
  .option('-c, --capability <cap>', 'Filter by capability')
  .option('-j, --json', 'Output as JSON')
  .action(async (opts) => {
    const spinner = ora('Fetching models…').start();
    try {
      const params: Record<string, string> = {};
      if (opts.provider) params.provider = opts.provider;
      if (opts.capability) params.capability = opts.capability;
      const models = await api.getModels(params);
      spinner.stop();

      if (opts.json) {
        console.log(JSON.stringify(models, null, 2));
        return;
      }

      const rows = (models ?? []).map((m: any) => [
        chalk.white(m.displayName ?? m.name),
        chalk.dim(m.provider),
        formatNumber(m.contextWindow) + ' ctx',
        m.pricing ? `$${m.pricing.inputPerMillion}/$${m.pricing.outputPerMillion}` : '—',
        m.status === 'active' ? chalk.green('●') : chalk.red('○'),
      ]);

      console.log(table(['Model', 'Provider', 'Context', 'Pricing (in/out per 1M)', 'Status'], rows));
      console.log(chalk.dim(`\n${models?.length ?? 0} models available`));
    } catch (error) {
      spinner.fail('Failed to fetch models');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

modelsCommand
  .command('search <query>')
  .description('Search models')
  .action(async (query) => {
    const spinner = ora('Searching…').start();
    try {
      const results = await api.searchModels(query);
      spinner.stop();

      if (!results?.length) {
        console.log(chalk.dim('No models found.'));
        return;
      }

      for (const m of results) {
        console.log(`  ${chalk.white(m.displayName ?? m.name)} ${chalk.dim(`(${m.provider})`)} — ${formatNumber(m.contextWindow)} tokens`);
      }
    } catch (error) {
      spinner.fail('Search failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

modelsCommand
  .command('sync')
  .description('Sync models from all providers')
  .action(async () => {
    const spinner = ora('Syncing models from providers…').start();
    try {
      const result = await api.syncModels();
      spinner.succeed(`Synced: ${result.added} added, ${result.updated} updated`);
      if (result.errors?.length) {
        for (const err of result.errors) {
          console.log(chalk.yellow(`  ⚠ ${err}`));
        }
      }
    } catch (error) {
      spinner.fail('Sync failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

modelsCommand
  .command('set-default <model>')
  .description('Set default model')
  .action(async (model) => {
    set('defaultModel', model);
    console.log(chalk.green(`✓ Default model set to ${model}`));
  });
