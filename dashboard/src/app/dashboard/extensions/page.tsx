'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Puzzle, Plus, Settings } from 'lucide-react';

export default function ExtensionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold">Extensions</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Plugins, integrations, and connectors</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> Browse Extensions</Button>
      </div>

      <Card>
        <div className="py-12 text-center">
          <Puzzle className="mx-auto h-8 w-8 text-[var(--color-text-tertiary)]" />
          <p className="mt-3 text-[13px] text-[var(--color-text-tertiary)]">No extensions installed yet</p>
          <Button size="sm" variant="secondary" className="mt-3"><Settings className="h-3.5 w-3.5" /> Browse Marketplace</Button>
        </div>
      </Card>
    </div>
  );
}
