'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Users, Plus, Mail } from 'lucide-react';

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Team</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Manage team members and roles</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> Invite Member</Button>
      </div>

      <Card>
        <DataTable
          data={[]}
          emptyMessage="Invite team members to collaborate"
          columns={[
            { key: 'name', header: 'Member', render: () => '' },
            { key: 'role', header: 'Role', render: () => '' },
            { key: 'status', header: 'Status', render: () => '' },
          ]}
        />
      </Card>
    </div>
  );
}
