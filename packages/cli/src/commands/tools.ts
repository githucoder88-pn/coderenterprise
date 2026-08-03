/**
 * coder tools — Tool management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';
import { table } from '../ui/table.js';

export const toolsCommand = new Command('tools')
  .description('Manage execution tools');

toolsCommand
  .command('list')
  .description('List available tools')
  .option('-c, --category <category>', 'Filter by category')
  .option('-j, --json', 'Output as JSON')
  .action(async (opts) => {
    const spinner = ora('Fetching tools…').start();
    try {
      const tools = await api.getTools(opts.category);
      spinner.stop();

      if (opts.json) { console.log(JSON.stringify(tools, null, 2)); return; }

      const rows = (tools ?? []).map((t: any) => [
        chalk.white(t.name),
        chalk.dim(t.category),
        chalk.dim(t.id),
        t.dangerous ? chalk.red('⚠') : chalk.green('✓'),
        t.requiresConfirmation ? chalk.yellow('confirm') : chalk.dim('auto'),
      ]);

      console.log(table(['Tool', 'Category', 'ID', 'Safe', 'Mode'], rows));
      console.log(chalk.dim(`\n${tools?.length ?? 0} tools available`));
    } catch (error) {
      spinner.fail('Failed to fetch tools');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

toolsCommand
  .command('execute <toolId>')
  .description('Execute a tool')
  .option('-i, --input <json>', 'Tool input as JSON')
  .option('--dry-run', 'Dry run mode')
  .action(async (toolId, opts) => {
    let input = {};
    try {
      if (opts.input) input = JSON.parse(opts.input);
    } catch {
      console.error(chalk.red('Invalid JSON input'));
      process.exit(1);
    }

    const spinner = ora(`Executing ${toolId}…`).start();
    try {
      const result = await api.executeTool(toolId, input);
      spinner.stop();

      if (result.success) {
        console.log(chalk.green('✓ Tool executed successfully'));
        if (result.output) console.log(JSON.stringify(result.output, null, 2));
      } else {
        console.log(chalk.red(`✗ Tool failed: ${result.error}`));
      }
    } catch (error) {
      spinner.fail('Execution failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

toolsCommand
  .command('stats')
  .description('Show tool execution statistics')
  .action(async () => {
    try {
      const stats = await api.getTools();
      console.log(chalk.bold('\n  Tool Statistics\n'));
      console.log(`  Total tools: ${stats.totalTools}`);
      console.log(`  Enabled: ${stats.enabledTools}`);
      console.log(`  Total executions: ${stats.totalExecutions}`);
      console.log('\n  By category:');
      for (const [cat, count] of Object.entries(stats.byCategory ?? {})) {
        console.log(`    ${cat}: ${count}`);
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });
