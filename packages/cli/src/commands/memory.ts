/**
 * coder memory — Memory management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';

export const memoryCommand = new Command('memory')
  .description('Manage long-term memory');

memoryCommand
  .command('search <query>')
  .description('Search memories')
  .action(async (query) => {
    const spinner = ora('Searching memories…').start();
    try {
      const results = await api.searchMemory(query);
      spinner.stop();
      const memories = results ?? [];
      if (memories.length === 0) {
        console.log(chalk.dim('No memories found.'));
        return;
      }
      for (const m of memories) {
        console.log(`  ${chalk.cyan(m.type)} ${chalk.dim(`(importance: ${m.importance})`)} ${m.content.slice(0, 100)}`);
      }
    } catch (error) {
      spinner.fail('Search failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

memoryCommand
  .command('store')
  .description('Store a memory')
  .option('-c, --content <content>', 'Memory content')
  .option('-t, --type <type>', 'Memory type', 'long_term')
  .option('-i, --importance <n>', 'Importance (0-100)', '50')
  .action(async (opts) => {
    if (!opts.content) {
      console.error(chalk.red('Content is required'));
      return;
    }
    try {
      await api.storeMemory({ content: opts.content, type: opts.type, importance: parseInt(opts.importance) });
      console.log(chalk.green('✓ Memory stored'));
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });
