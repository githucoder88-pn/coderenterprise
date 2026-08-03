/**
 * App Shell — Main desktop layout with resizable panels
 */

import type { ReactNode } from 'react';
import { useAppStore } from '../../stores/app-store';
import { TitleBar } from './title-bar';
import { Sidebar } from './sidebar';
import { CommandPalette } from '../command-palette/command-palette';
import { cn } from '../../lib/utils';

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarVisible, terminalVisible, chatVisible } = useAppStore();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg)]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && <Sidebar />}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
