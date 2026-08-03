/**
 * Terminal View — xterm.js integrated with the Electron PTY bridge.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import type { Terminal as XTerm } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { Plus, Square, Terminal as TermIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PTYBridge } from '../../src/terminal/PTYBridge';
import { TerminalManager } from '../../src/terminal/TerminalManager';
import { useTerminalStore } from '../../src/terminal/SessionManager';
import { terminalStreams } from '../../src/terminal/StreamManager';

export function TerminalView() {
  const { sessions, activeId, activate } = useTerminalStore();
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [fallbackBuffer, setFallbackBuffer] = useState('');
  const [xtermUnavailable, setXtermUnavailable] = useState(false);

  const createSession = useCallback(async () => {
    await TerminalManager.create({});
  }, []);

  useEffect(() => { TerminalManager.wire(); }, []);

  useEffect(() => {
    if (!activeId || !termRef.current) return;
    let cleanupStream: () => void = () => undefined;
    let disposed = false;

    import('@xterm/xterm').then(async ({ Terminal }) => {
      const { FitAddon } = await import('@xterm/addon-fit');
      if (disposed || !termRef.current) return;
      xtermRef.current?.dispose();
      termRef.current.innerHTML = '';

      const terminal = new Terminal({
        allowProposedApi: true,
        cursorBlink: true,
        cursorStyle: 'bar',
        fontFamily: 'JetBrains Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.2,
        scrollback: 10_000,
        theme: {
          background: '#0d1117',
          foreground: '#d1d5db',
          cursor: '#60a5fa',
          selectionBackground: '#1d4ed866',
          black: '#0d1117', red: '#ef4444', green: '#22c55e', yellow: '#eab308', blue: '#3b82f6', magenta: '#a855f7', cyan: '#06b6d4', white: '#e5e7eb',
          brightBlack: '#4b5563', brightRed: '#f87171', brightGreen: '#4ade80', brightYellow: '#facc15', brightBlue: '#60a5fa', brightMagenta: '#c084fc', brightCyan: '#22d3ee', brightWhite: '#f9fafb',
        },
      });
      const fit = new FitAddon();
      terminal.loadAddon(fit);
      terminal.open(termRef.current);
      fit.fit();
      terminal.write(terminalStreams.snapshot(activeId));
      xtermRef.current = terminal;
      fitRef.current = fit;

      terminal.onData((data) => { void PTYBridge.write(activeId, data); });
      cleanupStream = terminalStreams.subscribe(activeId, (data) => terminal.write(data));
      const resizeObserver = new ResizeObserver(() => {
        fit.fit();
        if (terminal.cols && terminal.rows) void PTYBridge.resize(activeId, terminal.cols, terminal.rows);
      });
      resizeObserver.observe(termRef.current);
      terminal.focus();
      cleanupStream = ((previous) => () => { previous(); resizeObserver.disconnect(); })(cleanupStream);
    }).catch(() => {
      setXtermUnavailable(true);
      setFallbackBuffer(terminalStreams.snapshot(activeId));
      cleanupStream = terminalStreams.subscribe(activeId, (data) => setFallbackBuffer((current) => `${current}${data}`.slice(-100_000)));
    });

    return () => {
      disposed = true;
      cleanupStream();
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitRef.current = null;
    };
  }, [activeId]);

  return (
    <div className="flex h-full flex-col bg-[#0d1117]">
      <div className="flex h-8 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => activate(session.id)}
            className={cn(
              'group flex h-full items-center gap-1.5 border-r border-[var(--color-border)] px-3 text-[11px] transition-colors',
              session.id === activeId ? 'bg-[#0d1117] text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)]',
            )}
          >
            <TermIcon className="h-3 w-3" />
            {session.name}
            {session.exitCode !== undefined && <span className="text-[var(--color-error)]">exited</span>}
            <span role="button" tabIndex={-1} onClick={(event) => { event.stopPropagation(); void TerminalManager.stop(session.id); }} className="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bg-muted)]"><X className="h-2.5 w-2.5" /></span>
          </button>
        ))}
        <button onClick={createSession} className="flex h-full items-center px-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"><Plus className="h-3.5 w-3.5" /></button>
        {activeId && <button onClick={() => void TerminalManager.stop(activeId)} className="ml-auto flex h-full items-center gap-1 px-3 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)]"><Square className="h-3 w-3" />Stop</button>}
      </div>

      <div className="min-h-0 flex-1 p-1">
        {sessions.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <button onClick={createSession} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-2 text-[13px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]">
              Open a PTY terminal
            </button>
          </div>
        ) : xtermUnavailable ? (
          <pre className="h-full overflow-auto whitespace-pre-wrap p-2 font-mono text-[13px] text-green-300">{fallbackBuffer}</pre>
        ) : (
          <div ref={termRef} className="h-full w-full overflow-hidden" />
        )}
      </div>
    </div>
  );
}
