'use client';

import { useWorkspaces } from '@/hooks/use-api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus, GitBranch } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function WorkspacesPage() {
  const { data } = useWorkspaces();
  const workspaces = (data as any)?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Workspaces</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">{workspaces.length} workspaces</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Workspace</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((ws: any) => (
          <Card key={ws.id} className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="h-4 w-4 text-[var(--color-brand)]" />
                <div>
                  <div className="text-[14px] font-semibold">{ws.name}</div>
                  <div className="text-[12px] text-[var(--color-text-tertiary)]">{ws.slug}</div>
                </div>
              </div>
              <Badge variant={ws.status === 'active' ? 'success' : 'default'}>{ws.status}</Badge>
            </div>
            <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">{ws.description || 'No description'}</p>
            <div className="mt-3 flex items-center gap-3 text-[12px] text-[var(--color-text-tertiary)]">
              <span>{ws.memberCount} members</span>
              <span>{formatRelativeTime(ws.updatedAt)}</span>
            </div>
          </Card>
        ))}
        {workspaces.length === 0 && (
          <Card className="col-span-full">
            <p className="py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">No workspaces. Create one to get started.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
