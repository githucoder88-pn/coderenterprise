'use client';

import { useConversations } from '@/hooks/use-api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeTime, truncate } from '@/lib/utils';
import { MessageSquare, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ConversationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useConversations(page);
  const conversations = (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text)]">Conversations</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">{pagination?.total ?? 0} conversations</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Conversation</Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2">
        <Search className="h-4 w-4 text-[var(--color-text-tertiary)]" />
        <input placeholder="Search conversations…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--color-text-tertiary)]" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {conversations.map((conv: any) => (
          <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`}>
            <Card className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]" padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{conv.title}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">
                      {conv.model} · {conv.messageCount} messages · {conv.totalTokens?.toLocaleString()} tokens
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={conv.status === 'active' ? 'success' : 'default'}>{conv.status}</Badge>
                  <span className="text-[12px] text-[var(--color-text-tertiary)]">{formatRelativeTime(conv.lastMessageAt ?? conv.createdAt)}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {conversations.length === 0 && !isLoading && (
          <Card padding="md">
            <p className="py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">No conversations yet. Start one to begin.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
