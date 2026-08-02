/**
 * coder agents — Agent management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getDatabase } from '../storage/database.js';

export const agentsCommand = new Command('agents')
  .description('Manage AI agents');

agentsCommand
  .command('list')
  .description('List saved agents')
  .action(() => {
    const db = getDatabase();
    const agents = db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all() as any[];
    if (agents.length === 0) {
      console.log(chalk.dim('No agents configured.'));
      return;
    }
    for (const agent of agents) {
      console.log(`  ${chalk.white(agent.name)} ${chalk.dim(`(${agent.model ?? 'default'})`)} — ${agent.description ?? 'No description'}`);
    }
  });

agentsCommand
  .command('create')
  .description('Create a new agent')
  .option('-n, --name <name>', 'Agent name')
  .option('-m, --model <model>', 'Default model')
  .option('-s, --system <prompt>', 'System prompt')
  .action((opts) => {
    if (!opts.name) {
      console.error(chalk.red('Name is required'));
      return;
    }
    const db = getDatabase();
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO agents (id, name, model, system_prompt) VALUES (?, ?, ?, ?)').run(id, opts.name, opts.model ?? null, opts.system ?? null);
    console.log(chalk.green(`✓ Agent "${opts.name}" created`));
  });
