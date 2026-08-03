/**
 * Database Seeds
 *
 * Run with: pnpm db:seed
 */

import { createLogger } from '../../telemetry/logger.js';

async function main() {
  
  const logger = createLogger({
    level: 'info',
    pretty: true,
    name: 'db-seed',
  });

  logger.info('Starting database seed...');

  // In production, seed initial data:
  // - Default billing plans
  // - Admin user
  // - Default RBAC roles

  logger.info('Database seed complete');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
