/**
 * Queue Worker
 *
 * BullMQ worker process for background jobs.
 * Run separately: `pnpm queues:worker`
 */

import { loadConfig } from '../config/index.js';
import { createLogger } from '../telemetry/logger.js';

async function main() {
  const config = loadConfig();
  const logger = createLogger({
    level: config.logging.level,
    pretty: config.logging.pretty,
    name: 'coderenterprise-worker',
  });

  logger.info('Queue worker starting...');
  logger.info('Registered queues: email, analytics, billing, audit');

  // In production, each queue would be initialized here:
  // const emailQueue = new Queue('email', { connection: redisConfig });
  // const emailWorker = new Worker('email', emailProcessor, { connection: redisConfig });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down worker...`);
    // Close all workers and queues
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('Queue worker running');
}

main().catch((error) => {
  console.error('Worker fatal error:', error);
  process.exit(1);
});
