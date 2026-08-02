'use client';

import { useSubscription, usePlans, useInvoices, useQuotas } from '@/hooks/use-api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Stat } from '@/components/ui/stat';
import { DataTable } from '@/components/ui/data-table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard, Check, Zap } from 'lucide-react';

export default function BillingPage() {
  const { data: sub } = useSubscription();
  const { data: plans } = usePlans();
  const { data: invoices } = useInvoices();
  const { data: quotas } = useQuotas();

  const subscription = (sub as any);
  const planList = (plans as any) ?? [];
  const invoiceList = (invoices as any)?.data ?? [];
  const quotaData = (quotas as any);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold">Billing</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Manage subscription, invoices, and usage limits</p>
      </div>

      {/* Current Plan */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold">Current Plan</div>
            <div className="mt-1 text-[24px] font-bold capitalize">{subscription?.planId ?? 'Free'}</div>
            <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'} className="mt-1">{subscription?.status ?? 'active'}</Badge>
          </div>
          <Button variant="secondary" size="sm">Manage Subscription</Button>
        </div>
      </Card>

      {/* Quotas */}
      {quotaData?.usage && (
        <Card>
          <CardHeader><CardTitle>Usage Limits</CardTitle></CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(quotaData.usage).map(([metric, data]: [string, any]) => (
              <div key={metric}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="capitalize text-[var(--color-text-secondary)]">{metric}</span>
                  <span className="font-medium">{Math.round(data.percent)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                  <div className="h-full rounded-full bg-[var(--color-brand)]" style={{ width: `${Math.min(100, data.percent)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">{data.used.toLocaleString()} / {data.limit === Infinity ? '∞' : data.limit.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Plans */}
      <Card>
        <CardHeader><CardTitle>Available Plans</CardTitle></CardHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {planList.map((plan: any) => (
            <div key={plan.id} className={`rounded-[var(--radius-lg)] border p-4 ${plan.id === (subscription?.planId ?? 'free') ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)]' : 'border-[var(--color-border)]'}`}>
              <div className="text-[14px] font-semibold">{plan.name}</div>
              <div className="mt-1 text-[22px] font-bold">{plan.price === 0 ? 'Free' : `${formatCurrency(plan.price)}`}<span className="text-[12px] font-normal text-[var(--color-text-tertiary)]">/mo</span></div>
              <ul className="mt-3 space-y-1.5">
                {plan.features.slice(0, 4).map((f: string) => (
                  <li key={f} className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                    <Check className="h-3 w-3 text-[var(--color-success)]" />{f.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
              {plan.id !== (subscription?.planId ?? 'free') && (
                <Button size="sm" variant={plan.price > 0 ? 'primary' : 'secondary'} className="mt-3 w-full">
                  {plan.price > (planList.find((p: any) => p.id === (subscription?.planId ?? 'free'))?.price ?? 0) ? 'Upgrade' : 'Downgrade'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <DataTable
          data={invoiceList}
          emptyMessage="No invoices yet"
          columns={[
            { key: 'number', header: 'Invoice', render: (r: any) => <span className="font-mono text-[12px]">{r.number}</span> },
            { key: 'status', header: 'Status', render: (r: any) => <Badge variant={r.status === 'paid' ? 'success' : r.status === 'open' ? 'warning' : 'default'}>{r.status}</Badge> },
            { key: 'total', header: 'Amount', render: (r: any) => formatCurrency(r.total) },
            { key: 'dueDate', header: 'Due Date', render: (r: any) => formatDate(r.dueDate) },
          ]}
        />
      </Card>
    </div>
  );
}
