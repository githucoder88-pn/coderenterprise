'use client';

import { useProfile } from '@/hooks/use-api';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Shield, Key, LogOut } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export default function AccountPage() {
  const { data: profile } = useProfile();
  const user = profile as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold">Account</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-text-tertiary)]">Profile and account settings</p>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand)] text-[18px] font-semibold text-white">
            {getInitials(user?.displayName ?? user?.email ?? 'U')}
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-semibold">{user?.displayName ?? 'User'}</div>
            <div className="text-[13px] text-[var(--color-text-secondary)]">{user?.email ?? '—'}</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="info">{user?.role ?? 'member'}</Badge>
              <Badge variant="outline">{user?.organizationId ? 'Organization' : 'Personal'}</Badge>
            </div>
          </div>
          <Button variant="secondary" size="sm">Edit Profile</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            <div>
              <div className="text-[13px] font-medium">Email Settings</div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">Manage email preferences</div>
            </div>
          </div>
        </Card>
        <Card className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            <div>
              <div className="text-[13px] font-medium">Security</div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">Password, 2FA, sessions</div>
            </div>
          </div>
        </Card>
        <Card className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            <div>
              <div className="text-[13px] font-medium">API Keys</div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">Manage access tokens</div>
            </div>
          </div>
        </Card>
        <Card className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]">
          <div className="flex items-center gap-3">
            <LogOut className="h-5 w-5 text-[var(--color-error)]" />
            <div>
              <div className="text-[13px] font-medium text-[var(--color-error)]">Sign Out</div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">End your session</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
