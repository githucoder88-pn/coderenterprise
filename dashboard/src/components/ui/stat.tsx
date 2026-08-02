import { cn, formatNumber, formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

interface StatProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  format?: 'number' | 'currency' | 'raw';
  className?: string;
}

export function Stat({ label, value, change, icon: Icon, format = 'raw', className }: StatProps) {
  const formattedValue = format === 'number' ? formatNumber(Number(value)) : format === 'currency' ? formatCurrency(Number(value)) : String(value);

  return (
    <div className={cn('rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-[var(--color-text-tertiary)]" />}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tracking-tight text-[var(--color-text)]">{formattedValue}</div>
      {change !== undefined && (
        <div className={cn('mt-1 flex items-center gap-1 text-[12px] font-medium', change >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]')}>
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  );
}
