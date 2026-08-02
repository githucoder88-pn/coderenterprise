'use client';

import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';
import { CommandPalette } from '../command-palette';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
