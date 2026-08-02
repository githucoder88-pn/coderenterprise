'use client';

import { useUsageSummary, useConversations, useProviders, useUnreadCount, useHealth } from '@/hooks/use-api';
import { Stat } from '@/components/ui/stat';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartArea } from '@/components/ui/chart';
import { formatNumber, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { Activity, MessageSquare, Cpu, CreditCard, Users, Zap, Server, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const { data: usage } = useUsageSummary();
  const { data: convs } = useConversations();
  const { data: providers } = useProviders();
  const { data: health } = useHealth();

  const summary = (usage as any)?.currentPeriod;
  const trend = (usage as any)?.trend;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-semibold text-[var(--color-text)]">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Overview of your CODER platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Requests" value={summary?.totalRequests ?? 0} format="number" icon={Activity} change={trend?.requestsDelta} />
        <Stat label="Token Usage" value={summary?.totalTokens ?? 0} format="number" icon={Zap} change={trend?.tokensDelta} />
        <Stat label="Monthly Spend" value={summary?.totalCost ?? 0} format="currency" icon={CreditCard} change={trend?.costDelta} />
        <Stat label="Conversations" value={(convs as any)?.pagination?.total ?? 0} format="number" icon={MessageSquare} />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usage Trend</CardTitle>
          </CardHeader>
          <ChartArea
            data={(usage as any)?.dailyBreakdown?.map((d: any) => ({ date: d.date.slice(5), requests: d.requests, tokens: d.tokens / 1000 })) ?? []}
            areas={[
              { key: 'requests', color: '#2563eb', label: 'Requests' },
              { key: 'tokens', color: '#16a34a', label: 'Tokens (K)' },
            ]}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-text-secondary)]">API Health</span>
              <Badge variant={(health as any)?.status === 'ok' ? 'success' : 'error'}>
                {(health as any)?.status ?? 'unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-text-secondary)]">Uptime</span>
              <span className="text-[13px] font-medium">{formatNumber((health as any)?.uptime ?? 0)}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-text-secondary)]">Providers</span>
              <span className="text-[13px] font-medium">{(providers as any)?.length ?? 0} connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-text-secondary)]">Error Rate</span>
              <span className="text-[13px] font-medium text-[var(--color-success)]">0.0%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Top Models</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {((usage as any)?.topModels ?? []).slice(0, 5).map((model: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 hover:bg-[var(--color-bg-subtle)]">
              <div className="flex items-center gap-2.5">
                <Cpu className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                <span className="text-[13px] font-medium">{model.model}</span>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-secondary)]">
                <span>{formatNumber(model.requests)} reqs</span>
                <span>{formatNumber(model.tokens)} tokens</span>
                <span className="font-medium text-[var(--color-text)]">{formatCurrency(model.cost)}</span>
              </div>
            </div>
          ))}
          {((usage as any)?.topModels ?? []).length === 0 && (
            <p className="py-6 text-center text-[13px] text-[var(--color-text-tertiary)]">No usage data yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
