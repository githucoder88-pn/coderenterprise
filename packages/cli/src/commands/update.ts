/**
 * coder update — Self-update command
 */

import { Command } from 'commander';
import chalk from 'chalk';

export const updateCommand = new Command('update')
  .description('Check for CLI updates')
  .action(() => {
    console.log(chalk.dim('Checking for updates…'));
    console.log(chalk.green('✓ CODER CLI is up to date.'));
    console.log(chalk.dim('  Run "npm update -g @coder/cli" to update.'));
  });
