import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main/index.ts',
        onstart(args) { args.startup(); },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: { external: ['electron', 'better-sqlite3', 'node-pty'] },
          },
        },
      },
      {
        entry: 'electron/preload/index.ts',
        onstart(args) { args.reload(); },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: { external: ['electron'] },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'renderer'),
      '@electron': path.resolve(__dirname, 'electron'),
    },
  },
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: { input: 'index.html' },
  },
});
