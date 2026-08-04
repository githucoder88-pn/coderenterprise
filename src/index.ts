/**
 * CODER Enterprise Backend
 *
 * Application entry point.
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { loadConfig } from './config/index.js';
import { createApp } from './app.js';

// Load repository-root .env before reading process.env in loadConfig().
loadEnv({ path: resolve(process.cwd(), '.env') });

async function main(): Promise<void> {
  const config = loadConfig();
  const app = createApp(config);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await app.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    app.logger.error({ reason }, 'Unhandled rejection');
  });
  process.on('uncaughtException', (error) => {
    app.logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });

  await app.start();
}

main().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
