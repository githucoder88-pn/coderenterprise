/**
 * coder billing — Billing and usage commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api.js';
import { table, table as renderTable } from '../ui/table.js';
import { formatNumber, formatCurrency } from '../ui/format.js';

export const billingCommand = new Command('billing')
  .description('View billing and usage');

billingCommand
  .command('usage')
  .description('Show current usage')
  .action(async () => {
    const spinner = ora('Fetching usage…').start();
    try {
      const usage = await api.getUsage();
      spinner.stop();
      const period = usage?.currentPeriod;
      if (!period) {
        console.log(chalk.dim('No usage data available.'));
        return;
      }

      console.log(chalk.bold('\n  Usage Summary\n'));
      console.log(`  Requests:   ${formatNumber(period.totalRequests)}`);
      console.log(`  Tokens:     ${formatNumber(period.totalTokens)}`);
      console.log(`  Cost:       ${formatCurrency(period.totalCost)}`);
      console.log(`  Avg Latency: ${Math.round(period.avgLatencyMs ?? 0)}ms`);

      if (usage?.topModels?.length) {
        console.log(chalk.bold('\n  Top Models\n'));
        const rows = usage.topModels.map((m: any) => [
          chalk.white(m.model),
          formatNumber(m.requests),
          formatNumber(m.tokens),
          formatCurrency(m.cost),
        ]);
        console.log(renderTable(['Model', 'Requests', 'Tokens', 'Cost'], rows));
      }
    } catch (error) {
      spinner.fail('Failed to fetch usage');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

billingCommand
  .command('plans')
  .description('List available plans')
  .action(async () => {
    try {
      const plans = await api.getPlans();
      for (const plan of plans ?? []) {
        console.log(`\n  ${chalk.bold(plan.name)} — ${plan.price === 0 ? 'Free' : formatCurrency(plan.price) + '/mo'}`);
        console.log(chalk.dim(`  ${plan.description}`));
        for (const f of (plan.features ?? []).slice(0, 4)) {
          console.log(chalk.dim(`    • ${f.replace(/_/g, ' ')}`));
        }
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });
