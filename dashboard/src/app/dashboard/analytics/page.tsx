'use client';

import { useUsageSummary } from '@/hooks/use-api';
import { Stat } from '@/components/ui/stat';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartArea, ChartBar, ChartPie } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Activity, Zap, CreditCard, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: usage } = useUsageSummary();
  const summary = (usage as any)?.currentPeriod;
  const trend = (usage as any)?.trend;

  const providerPieData = Object.entries(summary?.byProvider ?? {}).map(([name, data]: [string, any]) => ({
    name, value: data.requests,
  }));

  const modelBarData = Object.entries(summary?.byModel ?? {}).map(([name, data]: [string, any]) => ({
    model: name.split('/').pop()?.slice(0, 12) ?? name, tokens: Math.round(data.tokens / 1000), cost: data.cost,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-[var(--color-text)]">Analytics</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Usage metrics, costs, and performance</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Requests" value={summary?.totalRequests ?? 0} format="number" icon={Activity} change={trend?.requestsDelta} />
        <Stat label="Total Tokens" value={summary?.totalTokens ?? 0} format="number" icon={Zap} change={trend?.tokensDelta} />
        <Stat label="Total Cost" value={summary?.totalCost ?? 0} format="currency" icon={CreditCard} change={trend?.costDelta} />
        <Stat label="Avg Latency" value={`${Math.round(summary?.avgLatencyMs ?? 0)}ms`} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Daily Usage</CardTitle></CardHeader>
          <ChartArea
            data={(usage as any)?.dailyBreakdown?.map((d: any) => ({ date: d.date.slice(5), requests: d.requests, cost: d.cost })) ?? []}
            areas={[{ key: 'requests', color: '#2563eb' }, { key: 'cost', color: '#16a34a' }]}
          />
        </Card>
        <Card>
          <CardHeader><CardTitle>Requests by Provider</CardTitle></CardHeader>
          <ChartPie data={providerPieData} height={260} />
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Model Usage (Tokens in K)</CardTitle></CardHeader>
        <ChartBar
          data={modelBarData}
          bars={[{ key: 'tokens', color: '#2563eb', label: 'Tokens (K)' }]}
          xAxisKey="model"
        />
      </Card>

      <Card>
        <CardHeader><CardTitle>Latency Distribution</CardTitle></CardHeader>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'P50', value: summary?.p50LatencyMs },
            { label: 'P95', value: summary?.p95LatencyMs },
            { label: 'P99', value: summary?.p99LatencyMs },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <div className="text-[20px] font-semibold">{Math.round(p.value ?? 0)}ms</div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">{p.label} Latency</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
