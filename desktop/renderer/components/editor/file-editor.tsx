/**
 * File Editor — Monaco-powered editor surface.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { editor as MonacoEditorApi } from 'monaco-editor';
import { FileCode, Save, Search, SplitSquareHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EditorManager } from '../../src/editor/EditorManager';
import { MonacoProvider } from '../../src/editor/MonacoProvider';
import { SymbolManager } from '../../src/editor/SymbolManager';
import { useEditorStore } from '../../src/editor/EditorStore';
import { DiagnosticManager } from '../../src/editor/DiagnosticManager';

export function FileEditor() {
  const { tabs, activeTabId, closeTab, setActiveTab, updateContent, symbols } = useEditorStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditorApi.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<MonacoEditorApi.ITextModel | null>(null);
  const saveDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const [monacoReady, setMonacoReady] = useState(false);
  const [monacoFailed, setMonacoFailed] = useState(false);

  const activeSymbols = useMemo(() => activeTab ? symbols[activeTab.path] ?? [] : [], [activeTab, symbols]);

  useEffect(() => {
    let cancelled = false;
    MonacoProvider.load()
      .then(() => { if (!cancelled) setMonacoReady(true); })
      .catch(() => { if (!cancelled) setMonacoFailed(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeTab || !containerRef.current || !monacoReady) return;
    let disposed = false;

    MonacoProvider.load().then((monaco) => {
      if (disposed || !containerRef.current) return;
      saveDisposableRef.current?.dispose();
      editorRef.current?.dispose();
      modelRef.current?.dispose();

      const uri = monaco.Uri.parse(`file:///${activeTab.path}`);
      const model = monaco.editor.createModel(activeTab.content, activeTab.language, uri);
      modelRef.current = model;
      DiagnosticManager.apply(monaco, model);

      const editor = monaco.editor.create(containerRef.current, {
        model,
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        folding: true,
        fontFamily: 'JetBrains Mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontLigatures: true,
        fontSize: 13,
        formatOnPaste: true,
        formatOnType: true,
        glyphMargin: true,
        lineNumbers: 'on',
        linkedEditing: true,
        minimap: { enabled: true, autohide: 'mouseover', scale: 1 },
        mouseWheelZoom: true,
        multiCursorModifier: 'alt',
        occurrencesHighlight: 'singleFile',
        padding: { top: 16, bottom: 24 },
        renderLineHighlight: 'all',
        rulers: [100],
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        stickyScroll: { enabled: true },
        tabCompletion: 'on',
        theme: 'coder-dark',
        wordWrap: 'off',
      });
      editorRef.current = editor;

      model.onDidChangeContent(() => {
        const value = model.getValue();
        updateContent(activeTab.id, value);
        SymbolManager.refresh(activeTab.path, value);
      });

      saveDisposableRef.current = editor.onKeyDown((event) => {
        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
          event.preventDefault();
          void EditorManager.saveFile(activeTab.id);
        }
      });
      editor.addAction({ 
        id: 'coder.searchReplace',
        label: 'Search and Replace',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
        run: () => editor.getAction('actions.find')?.run(),
      });
      editor.focus();
    });

    return () => {
      disposed = true;
      saveDisposableRef.current?.dispose();
      editorRef.current?.dispose();
      modelRef.current?.dispose();
      saveDisposableRef.current = null;
      editorRef.current = null;
      modelRef.current = null;
    };
  }, [activeTab?.id, monacoReady]);

  if (tabs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--color-bg)]">
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/60 px-10 py-9 text-center shadow-2xl shadow-black/20">
          <FileCode className="mx-auto h-10 w-10 text-[var(--color-border-strong)]" />
          <p className="mt-3 text-[13px] text-[var(--color-text-secondary)]">Open a file to start editing</p>
          <p className="mt-1 text-[12px] text-[var(--color-text-tertiary)]">Use the explorer, symbols, or Ctrl+Shift+P</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="flex h-9 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'group flex h-full min-w-0 items-center gap-1.5 border-r border-[var(--color-border)] px-3 text-[12px] transition-colors',
                tab.id === activeTabId ? 'bg-[var(--color-bg)] text-[var(--color-text)]' : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)]',
              )}
            >
              <FileCode className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[150px] truncate">{tab.name}</span>
              {tab.modified && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-warning)]" />}
              <span
                role="button"
                tabIndex={-1}
                onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}
                className="ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--color-bg-muted)]"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
        <div className="flex h-full items-center border-l border-[var(--color-border)] px-1">
          <button title="Search" onClick={() => editorRef.current?.getAction('actions.find')?.run()} className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"><Search className="h-3.5 w-3.5" /></button>
          <button title="Save" onClick={() => activeTabId && void EditorManager.saveFile(activeTabId)} className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"><Save className="h-3.5 w-3.5" /></button>
          <button title="Split editor" className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"><SplitSquareHorizontal className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {activeTab && (
        <div className="flex h-7 shrink-0 items-center gap-1 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-3 text-[11px] text-[var(--color-text-tertiary)]">
          <span className="truncate">{activeTab.path}</span>
          {activeSymbols.slice(0, 4).map((symbol) => (
            <button key={`${symbol.name}:${symbol.line}`} onClick={() => editorRef.current?.revealLineInCenter(symbol.line)} className="rounded px-1.5 py-0.5 hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-secondary)]">› {symbol.name}</button>
          ))}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className={cn('absolute inset-0', (!monacoReady || monacoFailed) && 'hidden')} />
        {activeTab && (!monacoReady || monacoFailed) && (
          <textarea
            value={activeTab.content}
            onChange={(event) => updateContent(activeTab.id, event.target.value)}
            className="h-full w-full resize-none bg-[var(--color-bg)] p-4 font-mono text-[13px] leading-6 text-[var(--color-text)] outline-none"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
