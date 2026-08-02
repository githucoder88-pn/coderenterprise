'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import {
  LayoutDashboard, MessageSquare, FolderOpen, FileText, Server, Cpu, Users,
  CreditCard, Settings, Puzzle, Shield, ScrollText, User, ChevronLeft,
  Search, Zap, BarChart3, type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
      { label: 'Workspaces', href: '/dashboard/workspaces', icon: FolderOpen },
      { label: 'Prompts', href: '/dashboard/prompts', icon: FileText },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { label: 'Providers', href: '/dashboard/providers', icon: Server },
      { label: 'Models', href: '/dashboard/models', icon: Cpu },
      { label: 'Extensions', href: '/dashboard/extensions', icon: Puzzle },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Team', href: '/dashboard/team', icon: Users },
      { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
      { label: 'Security', href: '/dashboard/security', icon: Shield },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Logs', href: '/dashboard/logs', icon: ScrollText },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      { label: 'Account', href: '/dashboard/account', icon: User },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-subtle)] transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[var(--color-brand)]" />
            <span className="text-sm font-semibold tracking-tight">CODER</span>
          </Link>
        )}
        <button
          onClick={toggle}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navigation.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]',
                    collapsed && 'justify-center px-0',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {item.badge && !collapsed && (
                    <span className="ml-auto rounded-full bg-[var(--color-error)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      {!collapsed && (
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] p-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand)] text-[11px] font-semibold text-white">
              U
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">User</div>
              <div className="truncate text-[11px] text-[var(--color-text-tertiary)]">Free Plan</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
