'use client';

import { usePrompts } from '@/hooks/use-api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Star, Copy } from 'lucide-react';
import { formatRelativeTime, truncate } from '@/lib/utils';
import { useState } from 'react';

export default function PromptsPage() {
  const [page] = useState(1);
  const { data } = usePrompts(page);
  const prompts = (data as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Prompts</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Prompt library and templates</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Prompt</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {prompts.map((prompt: any) => (
          <Card key={prompt.id} className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                <div className="text-[14px] font-semibold">{prompt.name}</div>
              </div>
              {prompt.isPublic && <Badge variant="info">Public</Badge>}
            </div>
            <p className="mt-2 text-[12px] text-[var(--color-text-secondary)] line-clamp-2">{truncate(prompt.content, 120)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(prompt.tags ?? []).map((tag: string) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--color-text-tertiary)]">
              <span>v{prompt.version} · {prompt.usageCount} uses</span>
              <span>{formatRelativeTime(prompt.updatedAt)}</span>
            </div>
          </Card>
        ))}
        {prompts.length === 0 && (
          <Card className="col-span-full">
            <p className="py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">No prompts yet. Create your first prompt template.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
