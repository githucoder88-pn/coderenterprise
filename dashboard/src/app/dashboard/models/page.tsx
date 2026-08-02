'use client';

import { useModels, useSyncModels } from '@/hooks/use-api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Cpu, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';

export default function ModelsPage() {
  const [provider, setProvider] = useState<string>('');
  const [search, setSearch] = useState('');
  const { data: models, isLoading } = useModels(provider ? { provider } : undefined);
  const syncMutation = useSyncModels();

  const modelList = ((models as any) ?? []).filter((m: any) =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.provider?.toLowerCase().includes(search.toLowerCase()),
  );

  const providers = [...new Set(((models as any) ?? []).map((m: any) => m.provider))] as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text)]">Models</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Dynamically synced from provider APIs</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => syncMutation.mutate()} loading={syncMutation.isPending}>
          <RefreshCw className="h-3.5 w-3.5" /> Sync Now
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search models…" className="bg-transparent text-[13px] outline-none placeholder:text-[var(--color-text-tertiary)]" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setProvider('')} className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors ${!provider ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]'}`}>All</button>
          {providers.map((p) => (
            <button key={p} onClick={() => setProvider(p)} className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${provider === p ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <DataTable
          data={modelList}
          emptyMessage="No models found. Try syncing providers."
          columns={[
            { key: 'name', header: 'Model', render: (row: any) => (
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                <span className="font-medium">{row.displayName ?? row.name}</span>
              </div>
            )},
            { key: 'provider', header: 'Provider', render: (row: any) => <span className="capitalize">{row.provider}</span> },
            { key: 'contextWindow', header: 'Context', render: (row: any) => formatNumber(row.contextWindow) },
            { key: 'maxOutputTokens', header: 'Max Output', render: (row: any) => formatNumber(row.maxOutputTokens) },
            { key: 'pricing', header: 'Pricing', render: (row: any) => row.pricing ? `${formatCurrency(row.pricing.inputPerMillion, 'USD')}/${formatCurrency(row.pricing.outputPerMillion, 'USD')} per 1M` : '—' },
            { key: 'status', header: 'Status', render: (row: any) => <Badge variant={row.status === 'active' ? 'success' : row.deprecated ? 'warning' : 'error'}>{row.status}</Badge> },
          ]}
        />
      </Card>
    </div>
  );
}
