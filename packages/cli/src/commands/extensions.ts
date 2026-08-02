/**
 * coder extensions — Extension management
 */

import { Command } from 'commander';
import chalk from 'chalk';

export const extensionsCommand = new Command('extensions')
  .description('Manage extensions');

extensionsCommand
  .command('list')
  .description('List installed extensions')
  .action(() => {
    console.log(chalk.dim('No extensions installed.'));
    console.log(chalk.dim('Use "coder extensions install <name>" to add extensions.'));
  });

extensionsCommand
  .command('install <name>')
  .description('Install an extension')
  .action((name) => {
    console.log(chalk.dim(`Extension marketplace coming soon. Requested: ${name}`));
  });
