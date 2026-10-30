'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { Search, MessageSquare, FolderOpen, Cpu, Settings, ScrollText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const router = useRouter();
  const [query, setQuery] = useState('');

  const commands: Command[] = [
    { id: 'conv', label: 'Create conversation', description: 'Start a new conversation', icon: MessageSquare, action: () => { router.push('/dashboard/conversations'); setOpen(false); } },
    { id: 'ws', label: 'Switch workspace', description: 'Change active workspace', icon: FolderOpen, action: () => { router.push('/dashboard/workspaces'); setOpen(false); } },
    { id: 'models', label: 'Search models', description: 'Find and compare AI models', icon: Cpu, action: () => { router.push('/dashboard/models'); setOpen(false); } },
    { id: 'settings', label: 'Open settings', description: 'Manage your settings', icon: Settings, action: () => { router.push('/dashboard/settings'); setOpen(false); } },
    { id: 'logs', label: 'View logs', description: 'View audit and activity logs', icon: ScrollText, action: () => { router.push('/dashboard/logs'); setOpen(false); } },
    { id: 'analytics', label: 'View analytics', description: 'Usage and spending analytics', icon: ScrollText, action: () => { router.push('/dashboard/analytics'); setOpen(false); } },
  ];

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape') setOpen(false);
    },
    [open, setOpen],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => { if (open) setQuery(''); }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-[520px] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center border-b border-[var(--color-border)] px-4">
              <Search className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent px-3 py-3 text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)]"
                autoFocus
              />
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
                aria-label="Close command palette"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">No results found</div>
              ) : (
                filtered.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--color-bg-muted)]"
                  >
                    <cmd.icon className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--color-text)]">{cmd.label}</div>
                      <div className="text-[12px] text-[var(--color-text-tertiary)]">{cmd.description}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
