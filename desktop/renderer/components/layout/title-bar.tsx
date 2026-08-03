/**
 * Title Bar — macOS-style traffic light area
 */

import { useAppStore } from '../../stores/app-store';
import { cn } from '../../lib/utils';

export function TitleBar() {
  return (
    <div className="titlebar-drag flex h-10 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4">
      <div className="titlebar-no-drag flex flex-1 items-center justify-center">
        <span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">CODER</span>
      </div>
    </div>
  );
}
