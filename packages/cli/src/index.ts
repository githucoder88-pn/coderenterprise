/**
 * CODER CLI — Entry Point
 */

import { program } from 'commander';
import chalk from 'chalk';
import { loginCommand, logoutCommand } from './commands/login.js';
import { chatCommand } from './commands/chat.js';
import { modelsCommand } from './commands/models.js';
import { statusCommand, versionCommand, doctorCommand } from './commands/status.js';
import { providersCommand } from './commands/providers.js';
import { workspaceCommand } from './commands/workspace.js';
import { toolsCommand } from './commands/tools.js';
import { configCommand } from './commands/config.js';
import { memoryCommand } from './commands/memory.js';
import { billingCommand } from './commands/billing.js';
import { logsCommand } from './commands/logs.js';
import { extensionsCommand } from './commands/extensions.js';
import { agentsCommand } from './commands/agents.js';
import { updateCommand } from './commands/update.js';

program
  .name('coder')
  .description('CODER — Enterprise AI platform CLI')
  .version('1.0.0')
  .option('--no-color', 'Disable colored output');

// Register commands
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(chatCommand);
program.addCommand(modelsCommand);
program.addCommand(statusCommand);
program.addCommand(versionCommand);
program.addCommand(doctorCommand);
program.addCommand(providersCommand);
program.addCommand(workspaceCommand);
program.addCommand(toolsCommand);
program.addCommand(configCommand);
program.addCommand(memoryCommand);
program.addCommand(billingCommand);
program.addCommand(logsCommand);
program.addCommand(extensionsCommand);
program.addCommand(agentsCommand);
program.addCommand(updateCommand);

// Global error handler
program.exitOverride();

try {
  await program.parseAsync();
} catch (error: any) {
  if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
    process.exit(0);
  }
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
}
