/**
 * Workspace View — resizable editor, chat, and terminal workbench layout.
 */

import { useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { FileEditor } from '../components/editor/file-editor';
import { ChatPanel } from '../components/chat/chat-panel';
import { TerminalView } from '../components/terminal/terminal-view';

export function WorkspaceView() {
  const { terminalVisible, chatVisible } = useAppStore();
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [chatWidth, setChatWidth] = useState(390);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <FileEditor />
        {terminalVisible && (
          <>
            <div
              className="h-1 shrink-0 cursor-row-resize bg-[var(--color-border-subtle)] transition-colors hover:bg-[var(--color-brand)]"
              onMouseDown={(event) => {
                const startY = event.clientY;
                const startHeight = terminalHeight;
                const onMove = (moveEvent: MouseEvent) => setTerminalHeight(Math.min(620, Math.max(180, startHeight - (moveEvent.clientY - startY))));
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
            <div className="shrink-0 border-t border-[var(--color-border)]" style={{ height: terminalHeight }}>
              <TerminalView />
            </div>
          </>
        )}
      </div>

      {chatVisible && (
        <>
          <div
            className="w-1 shrink-0 cursor-col-resize bg-[var(--color-border-subtle)] transition-colors hover:bg-[var(--color-brand)]"
            onMouseDown={(event) => {
              const startX = event.clientX;
              const startWidth = chatWidth;
              const onMove = (moveEvent: MouseEvent) => setChatWidth(Math.min(620, Math.max(300, startWidth - (moveEvent.clientX - startX))));
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          />
          <div className="shrink-0 border-l border-[var(--color-border)]" style={{ width: chatWidth }}>
            <ChatPanel />
          </div>
        </>
      )}
    </div>
  );
}
