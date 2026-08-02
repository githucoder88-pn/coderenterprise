import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  banner: { js: '#!/usr/bin/env node' },
  external: ['better-sqlite3', 'react', 'ink'],
});
