import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md';
}

export function Card({ children, padding = 'md', className, ...props }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5' };
  return (
    <div className={cn('rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]', paddings[padding], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4 flex items-center justify-between', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-[14px] font-semibold text-[var(--color-text)]', className)}>{children}</h3>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">{children}</p>;
}
