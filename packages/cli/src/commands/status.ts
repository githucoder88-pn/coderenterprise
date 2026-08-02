/**
 * coder status / coder version / coder doctor
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';
import { get, getAll } from '../config/store.js';
import { table } from '../ui/table.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const statusCommand = new Command('status')
  .description('Show current status')
  .action(async () => {
    const config = getAll();
    console.log(chalk.bold('\n  CODER Status\n'));

    const rows: string[][] = [
      ['API URL', config.apiUrl],
      ['Authenticated', config.apiKey ? chalk.green('Yes') : chalk.red('No')],
      ['Default Provider', config.defaultProvider ?? chalk.dim('auto')],
      ['Default Model', config.defaultModel ?? chalk.dim('auto')],
      ['Theme', config.theme],
      ['Streaming', config.streamByDefault ? 'enabled' : 'disabled'],
      ['Output Format', config.outputFormat],
    ];

    console.log(table(['Setting', 'Value'], rows));

    // Check server connectivity
    try {
      const health = await api.health();
      console.log(`\n  Server: ${chalk.green('●')} Connected (uptime: ${health.uptime ?? '?'}s)`);
    } catch {
      console.log(`\n  Server: ${chalk.red('●')} Disconnected`);
    }
  });

export const versionCommand = new Command('version')
  .description('Show version information')
  .action(() => {
    const pkg = getPackageJson();
    console.log(`\n  ${chalk.bold('CODER CLI')} v${pkg.version ?? '1.0.0'}`);
    console.log(chalk.dim(`  Node.js ${process.version}`));
    console.log(chalk.dim(`  Platform: ${process.platform} ${process.arch}\n`));
  });

export const doctorCommand = new Command('doctor')
  .description('Check system health')
  .action(async () => {
    console.log(chalk.bold('\n  CODER Doctor\n'));

    const checks: { name: string; ok: boolean; detail: string }[] = [];

    // Node.js version
    const nodeVersion = parseInt(process.version.slice(1), 10);
    checks.push({ name: 'Node.js', ok: nodeVersion >= 20, detail: process.version });

    // API connectivity
    const spinner = ora('Checking API…').start();
    try {
      const health = await api.health();
      spinner.stop();
      checks.push({ name: 'API Server', ok: true, detail: `Connected (uptime: ${health.uptime ?? '?'}s)` });
    } catch {
      spinner.stop();
      checks.push({ name: 'API Server', ok: false, detail: 'Cannot connect' });
    }

    // Deep health
    try {
      const deep = await api.deepHealth();
      for (const [name, check] of Object.entries(deep.checks ?? {})) {
        checks.push({ name: `  ${name}`, ok: (check as any).status === 'healthy', detail: `${Math.round((check as any).latencyMs ?? 0)}ms` });
      }
    } catch { /* skip */ }

    // Config
    const config = getAll();
    checks.push({ name: 'Configuration', ok: !!config.apiUrl, detail: config.apiUrl });

    // Print results
    for (const check of checks) {
      const icon = check.ok ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${icon} ${check.name} ${chalk.dim(check.detail)}`);
    }

    const failed = checks.filter((c) => !c.ok).length;
    console.log(failed === 0 ? chalk.green(`\n  All checks passed.\n`) : chalk.red(`\n  ${failed} check(s) failed.\n`));
  });

function getPackageJson(): any {
  try {
    return JSON.parse(readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8'));
  } catch {
    return { version: '1.0.0' };
  }
}
