/**
 * coder login — Authentication command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api, CLIError } from '../services/api.js';
import { set, get } from '../config/store.js';
import { input } from '@inquirer/prompts';

export const loginCommand = new Command('login')
  .description('Authenticate with CODER')
  .option('--api-key <key>', 'Authenticate with API key')
  .option('--email <email>', 'Email for password auth')
  .option('--password <password>', 'Password')
  .option('--url <url>', 'API server URL')
  .action(async (opts) => {
    // Set API URL if provided
    if (opts.url) {
      set('apiUrl', opts.url);
    }

    // API key authentication
    if (opts.apiKey) {
      set('apiKey', opts.apiKey);
      const spinner = ora('Verifying API key…').start();
      try {
        const me = await api.me();
        spinner.succeed(`Authenticated as ${me.email ?? me.uid}`);
        console.log(chalk.green(`✓ Logged in with API key`));
        return;
      } catch (error) {
        spinner.fail('Invalid API key');
        set('apiKey', undefined as any);
        process.exit(1);
      }
    }

    // Email/password authentication
    try {
      const email = opts.email ?? await input({ message: 'Email:' });
      const password = opts.password ?? await input({ message: 'Password:' });

      const spinner = ora('Signing in…').start();
      const result = await api.login({ email, password });
      spinner.succeed('Authenticated');

      if (result.tokens?.accessToken) {
        set('apiKey', result.tokens.accessToken);
      }

      console.log(chalk.green(`✓ Logged in as ${email}`));
      console.log(chalk.dim(`  Organization: ${result.user?.organizationId ?? 'none'}`));
      console.log(chalk.dim(`  Role: ${result.user?.role ?? 'member'}`));
    } catch (error) {
      if (error instanceof CLIError) {
        console.error(chalk.red(`✗ ${error.message}`));
      } else {
        console.error(chalk.red(`✗ Login failed: ${error instanceof Error ? error.message : String(error)}`));
      }
      process.exit(1);
    }
  });

export const logoutCommand = new Command('logout')
  .description('Sign out of CODER')
  .action(async () => {
    try {
      await api.logout();
    } catch { /* ignore */ }
    set('apiKey', undefined as any);
    console.log(chalk.green('✓ Signed out'));
  });
