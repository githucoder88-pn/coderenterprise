/**
 * Terminal View — xterm.js-based integrated terminal
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { Plus, X, Terminal as TermIcon } from 'lucide-react';

interface TerminalSession {
  id: string;
  name: string;
}

export function TerminalView() {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<any>(null);

  const createSession = useCallback(async () => {
    const id = await window.coder.terminal.start({});
    const session: TerminalSession = { id, name: `Terminal ${sessions.length + 1}` };
    setSessions((prev) => [...prev, session]);
    setActiveId(id);
  }, [sessions.length]);

  useEffect(() => {
    if (!activeId || !termRef.current) return;

    // In production, initialize xterm.js here
    const cleanupData = window.coder.terminal.onData(({ id, data }) => {
      if (id === activeId && termInstanceRef.current) {
        termInstanceRef.current.write(data);
      }
    });

    const cleanupExit = window.coder.terminal.onExit(({ id }) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    });

    return () => { cleanupData(); cleanupExit(); };
  }, [activeId]);

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      {/* Tabs */}
      <div className="flex h-8 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={cn(
              'flex h-full items-center gap-1.5 px-3 text-[11px] border-r border-[var(--color-border)]',
              s.id === activeId ? 'bg-[#0d1117] text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)]',
            )}
          >
            <TermIcon className="h-3 w-3" />
            {s.name}
            <button
              onClick={(e) => { e.stopPropagation(); window.coder.terminal.stop(s.id); setSessions((p) => p.filter((x) => x.id !== s.id)); }}
              className="ml-1 rounded p-0.5 hover:bg-[var(--color-bg-muted)]"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </button>
        ))}
        <button onClick={createSession} className="flex h-full items-center px-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Terminal */}
      <div ref={termRef} className="flex-1 p-2 font-mono text-[13px] text-green-400">
        {sessions.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <button onClick={createSession} className="text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
              Click to open a terminal
            </button>
          </div>
        ) : (
          <pre className="h-full overflow-auto whitespace-pre-wrap">$ </pre>
        )}
      </div>
    </div>
  );
}
