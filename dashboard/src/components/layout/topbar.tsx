'use client';

import { Search, Bell, Moon, Sun, Monitor, Command } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useUnreadCount } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

export function TopBar() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const toggleCmd = useUIStore((s) => s.toggleCommandPalette);
  const { data: unread } = useUnreadCount();

  const cycleTheme = () => {
    const order: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % 3]!);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4">
      {/* Search trigger */}
      <button
        onClick={toggleCmd}
        aria-label="Search or jump to..."
        className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1.5 text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)]"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search or jump to…</span>
        <kbd className="ml-4 hidden items-center gap-0.5 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-tertiary)] sm:inline-flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          aria-label={`Theme: ${theme}`}
        >
          <ThemeIcon className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          aria-label={
            (unread as any)?.count > 0
              ? `Notifications (${(unread as any).count} unread)`
              : 'Notifications'
          }
          className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
        >
          <Bell className="h-4 w-4" />
          {(unread as any)?.count > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-error)]" />
          )}
        </button>
      </div>
    </header>
  );
}
