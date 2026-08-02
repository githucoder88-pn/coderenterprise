import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'src/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/tests/**',
        'src/**/index.ts',
        'src/**/types.ts',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@providers': path.resolve(__dirname, 'src/providers'),
      '@middleware': path.resolve(__dirname, 'src/middleware'),
      '@queues': path.resolve(__dirname, 'src/queues'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@repositories': path.resolve(__dirname, 'src/repositories'),
      '@database': path.resolve(__dirname, 'src/database'),
      '@telemetry': path.resolve(__dirname, 'src/telemetry'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@tests': path.resolve(__dirname, 'src/tests'),
    },
  },
});
