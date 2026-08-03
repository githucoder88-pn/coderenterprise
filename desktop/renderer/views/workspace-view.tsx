/**
 * Workspace View — Main editor + chat + terminal layout
 */

import { useAppStore } from '../stores/app-store';
import { FileEditor } from '../components/editor/file-editor';
import { ChatPanel } from '../components/chat/chat-panel';
import { TerminalView } from '../components/terminal/terminal-view';
import { cn } from '../lib/utils';

export function WorkspaceView() {
  const { terminalVisible, chatVisible } = useAppStore();

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Editor Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <FileEditor />
        {terminalVisible && (
          <div className="h-[300px] shrink-0 border-t border-[var(--color-border)]">
            <TerminalView />
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {chatVisible && (
        <div className="w-[380px] shrink-0 border-l border-[var(--color-border)]">
          <ChatPanel />
        </div>
      )}
    </div>
  );
}
