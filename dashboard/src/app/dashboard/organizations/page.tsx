'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Users, Settings } from 'lucide-react';

export default function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Organizations</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Manage your organizations</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Organization</Button>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-subtle)]">
            <Building2 className="h-6 w-6 text-[var(--color-brand)]" />
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">Your Organization</div>
            <div className="text-[12px] text-[var(--color-text-tertiary)]">Default organization</div>
          </div>
          <Badge variant="success">Active</Badge>
          <Button variant="ghost" size="sm"><Settings className="h-3.5 w-3.5" /></Button>
        </div>
      </Card>
    </div>
  );
}
