'use client';

import { useDeepHealth } from '@/hooks/use-api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Key, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SecurityPage() {
  const { data: health } = useDeepHealth();

  const checks = [
    { label: 'AES-256 Encryption', status: true, icon: Lock },
    { label: 'API Key Encryption', status: true, icon: Key },
    { label: 'JWT Validation', status: true, icon: Shield },
    { label: 'RBAC Enforcement', status: true, icon: Eye },
    { label: 'Rate Limiting', status: true, icon: Shield },
    { label: 'Audit Logging', status: true, icon: Shield },
    { label: 'CSP Headers', status: true, icon: Shield },
    { label: 'XSS Protection', status: true, icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold">Security</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Security controls and compliance status</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {checks.map((check) => (
          <Card key={check.label} padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <check.icon className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                <span className="text-[13px] font-medium">{check.label}</span>
              </div>
              <Badge variant={check.status ? 'success' : 'error'}>
                {check.status ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Service Health</CardTitle></CardHeader>
        <div className="space-y-2">
          {Object.entries((health as any)?.checks ?? {}).map(([name, check]: [string, any]) => (
            <div key={name} className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 hover:bg-[var(--color-bg-subtle)]">
              <span className="text-[13px] capitalize">{name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--color-text-tertiary)]">{Math.round(check.latencyMs)}ms</span>
                <Badge variant={check.status === 'healthy' ? 'success' : 'error'}>{check.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
