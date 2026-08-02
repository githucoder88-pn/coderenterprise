'use client';

import { useUIStore } from '@/stores/ui-store';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, Monitor, Bell, Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold">Settings</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Application preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the interface theme</CardDescription>
        </CardHeader>
        <div className="flex gap-2">
          {([
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: Monitor },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-2.5 text-[13px] font-medium transition-colors',
                theme === opt.value ? 'border-[var(--color-brand)] bg-[var(--color-brand-subtle)] text-[var(--color-brand)]' : 'border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]',
              )}
            >
              <opt.icon className="h-4 w-4" />{opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {['Email notifications', 'In-app notifications', 'Push notifications'].map((pref) => (
            <div key={pref} className="flex items-center justify-between">
              <span className="text-[13px]">{pref}</span>
              <div className="h-5 w-9 rounded-full bg-[var(--color-brand)] p-0.5">
                <div className="h-4 w-4 translate-x-4 rounded-full bg-white transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
          <CardDescription>Manage API keys and access tokens</CardDescription>
        </CardHeader>
        <Button variant="secondary" size="sm">Manage API Keys</Button>
      </Card>
    </div>
  );
}
