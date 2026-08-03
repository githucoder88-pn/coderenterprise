import { useEffect, useMemo, useState } from 'react';
import { Command } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getCommands } from '../../src/command-palette/command-registry';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const commands = useMemo(() => getCommands(query), [query, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => { if (open) { setQuery(''); setSelected(0); } }, [open]);
  if (!open) return null;

  const run = async (index: number) => {
    const command = commands[index];
    if (!command) return;
    await command.execute();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
      <div className="mx-auto mt-[12vh] w-[min(720px,calc(100vw-32px))] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl shadow-black/40" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex h-12 items-center gap-3 border-b border-[var(--color-border)] px-4">
          <Command className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            autoFocus
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelected(0); }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
              if (event.key === 'ArrowDown') { event.preventDefault(); setSelected((value) => Math.min(value + 1, commands.length - 1)); }
              if (event.key === 'ArrowUp') { event.preventDefault(); setSelected((value) => Math.max(value - 1, 0)); }
              if (event.key === 'Enter') { event.preventDefault(); void run(selected); }
            }}
            placeholder="Type a command, file, symbol, provider, or model…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)]"
          />
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1">
          {commands.map((command, index) => (
            <button
              key={command.id}
              onMouseEnter={() => setSelected(index)}
              onClick={() => void run(index)}
              className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors', index === selected ? 'bg-[var(--color-bg-muted)]' : 'hover:bg-[var(--color-bg-subtle)]')}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-[var(--color-text)]">{command.title}</span>
                {command.subtitle && <span className="block truncate text-[11px] text-[var(--color-text-tertiary)]">{command.subtitle}</span>}
              </span>
              <span className="ml-4 rounded bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">{command.category}</span>
            </button>
          ))}
          {commands.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">No commands found.</div>}
        </div>
      </div>
    </div>
  );
}
