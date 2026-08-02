'use client';

import { useProviders, useProviderStats, useSyncModels } from '@/hooks/use-api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Stat } from '@/components/ui/stat';
import { cn } from '@/lib/utils';
import { Server, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const PROVIDER_ICONS: Record<string, string> = {
  openai: '🟢', anthropic: '🟠', gemini: '🔵', groq: '⚡', ollama: '🦙', openrouter: '🌐',
};

export default function ProvidersPage() {
  const { data: providers } = useProviders();
  const { data: stats } = useProviderStats();
  const syncMutation = useSyncModels();

  const providerList = (providers as any) ?? [];
  const providerStats = (stats as any) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text)]">Providers</h1>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">AI provider connections and status</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => syncMutation.mutate()} loading={syncMutation.isPending}>
          <RefreshCw className="h-3.5 w-3.5" /> Sync Models
        </Button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providerList.map((provider: any) => {
          const stat = providerStats.find((s: any) => s.name === provider.name);
          return (
            <Card key={provider.name}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{PROVIDER_ICONS[provider.name] ?? '🔧'}</span>
                  <div>
                    <div className="text-[14px] font-semibold capitalize">{provider.name}</div>
                    <div className="text-[12px] text-[var(--color-text-tertiary)]">{provider.capabilities?.supportedModels?.length ?? '—'} models</div>
                  </div>
                </div>
                <Badge variant={stat?.enabled !== false ? 'success' : 'error'}>
                  {stat?.enabled !== false ? 'Connected' : 'Disabled'}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">Streaming</div>
                  <div className="text-[13px] font-medium">{provider.capabilities?.streaming ? '✅' : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">Tools</div>
                  <div className="text-[13px] font-medium">{provider.capabilities?.toolCalling ? '✅' : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">Vision</div>
                  <div className="text-[13px] font-medium">{provider.capabilities?.vision ? '✅' : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">Reasoning</div>
                  <div className="text-[13px] font-medium">{provider.capabilities?.reasoning ? '✅' : '—'}</div>
                </div>
              </div>

              {stat && (
                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-[12px] text-[var(--color-text-tertiary)]">
                  <span>Circuit: <Badge variant={stat.circuitState === 'closed' ? 'success' : 'error'}>{stat.circuitState}</Badge></span>
                  <span>Queue: {stat.queueRunning}/{stat.queueQueued}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
