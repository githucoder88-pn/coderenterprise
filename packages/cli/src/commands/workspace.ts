/**
 * coder workspace — Workspace management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';
import { table } from '../ui/table.js';

export const workspaceCommand = new Command('workspace')
  .description('Manage workspaces');

workspaceCommand
  .command('list')
  .description('List workspaces')
  .option('-j, --json', 'Output as JSON')
  .action(async (opts) => {
    const spinner = ora('Fetching workspaces…').start();
    try {
      const result = await api.getWorkspaces();
      spinner.stop();
      const workspaces = result?.data ?? result ?? [];

      if (opts.json) { console.log(JSON.stringify(workspaces, null, 2)); return; }

      const rows = workspaces.map((w: any) => [
        chalk.white(w.name),
        chalk.dim(w.slug),
        `${w.memberCount ?? 0} members`,
        w.status,
      ]);

      console.log(table(['Name', 'Slug', 'Members', 'Status'], rows));
    } catch (error) {
      spinner.fail('Failed to fetch workspaces');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

workspaceCommand
  .command('index <workspaceId>')
  .description('Index a workspace')
  .action(async (wsId) => {
    const spinner = ora('Indexing workspace…').start();
    try {
      const result = await api.indexWorkspace(wsId);
      spinner.succeed(`Indexed: ${result.totalFiles ?? 0} files, ${result.totalSymbols ?? 0} symbols`);
    } catch (error) {
      spinner.fail('Index failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

workspaceCommand
  .command('search <query>')
  .description('Search workspace files')
  .option('-e, --engine <engine>', 'Search engine: keyword, semantic, hybrid, regex, ast', 'hybrid')
  .action(async (query, opts) => {
    const spinner = ora('Searching…').start();
    try {
      const result = await api.searchWorkspace({
        query, engine: opts.engine, workspaceId: 'default', maxResults: 20,
      });
      spinner.stop();

      const results = result?.results ?? [];
      if (results.length === 0) {
        console.log(chalk.dim('No results found.'));
        return;
      }

      for (const r of results) {
        console.log(`  ${chalk.cyan(r.filePath)}:${chalk.yellow(r.line)} ${chalk.dim(`[${r.engine}]`)} ${r.match?.trim()}`);
      }
      console.log(chalk.dim(`\n${results.length} results in ${result?.searchTimeMs?.toFixed(0) ?? '?'}ms`));
    } catch (error) {
      spinner.fail('Search failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });
