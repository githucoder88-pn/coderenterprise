/**
 * Chat Panel — Integrated conversation view
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Send, Square, Plus, ChevronDown } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const assistantMsg: ChatMessage = { id: `msg-${Date.now()}-a`, role: 'assistant', content: '', timestamp: new Date() };
    setMessages((prev) => [...prev, assistantMsg]);

    // Listen for streaming chunks
    const cleanup = window.coder.chat.onChunk((chunk: any) => {
      const delta = chunk.delta?.content ?? chunk.delta ?? '';
      if (typeof delta === 'string') {
        setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: m.content + delta } : m));
      }
    });

    const cleanupComplete = window.coder.chat.onComplete(() => {
      setIsStreaming(false);
      cleanup();
      cleanupComplete();
    });

    try {
      await window.coder.chat.send('current', { content: userMsg.content });
    } catch {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <div className="flex h-9 items-center justify-between border-b border-[var(--color-border)] px-3">
        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Chat</span>
        <button className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)]">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-[13px] text-[var(--color-text-tertiary)]">Start a conversation</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-[var(--radius-lg)] px-3 py-2 text-[13px] leading-5',
              msg.role === 'user' ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-bg-muted)] text-[var(--color-text)]',
            )}>
              <pre className="whitespace-pre-wrap font-sans">{msg.content || (msg.role === 'assistant' && !isStreaming ? '' : '…')}</pre>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Send a message…"
            rows={1}
            className="max-h-[120px] min-h-[20px] flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-[var(--color-text-tertiary)]"
          />
          <button
            onClick={isStreaming ? () => {} : sendMessage}
            disabled={!input.trim() && !isStreaming}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors',
              input.trim() ? 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]' : 'text-[var(--color-text-tertiary)]',
            )}
          >
            {isStreaming ? <Square className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
