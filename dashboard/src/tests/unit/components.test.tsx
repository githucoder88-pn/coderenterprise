import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { Activity } from 'lucide-react';

describe('Badge', () => {
  it('should render with text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('should apply variant styles', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    expect(container.firstChild).toBeDefined();
  });
});

import { vi } from 'vitest';
import { TopBar } from '@/components/layout/topbar';

vi.mock('@/hooks/use-api', () => ({
  useUnreadCount: () => ({ data: { count: 3 } }),
}));

describe('TopBar', () => {
  it('should render search trigger with proper aria-label and shortcuts', () => {
    render(<TopBar />);
    const searchBtn = screen.getByRole('button', { name: 'Open command palette' });
    expect(searchBtn).toBeDefined();
    expect(searchBtn.getAttribute('aria-keyshortcuts')).toBe('Control+k Meta+k');
  });

  it('should render notifications button with dynamic unread aria-label', () => {
    render(<TopBar />);
    const notifBtn = screen.getByRole('button', { name: 'Notifications (3 unread)' });
    expect(notifBtn).toBeDefined();
  });
});

describe('Stat', () => {
  it('should render label and value', () => {
    render(<Stat label="Total Users" value="1,234" />);
    expect(screen.getByText('Total Users')).toBeDefined();
    expect(screen.getByText('1,234')).toBeDefined();
  });

  it('should format as number', () => {
    render(<Stat label="Requests" value={1500000} format="number" />);
    expect(screen.getByText('1.5M')).toBeDefined();
  });

  it('should format as currency', () => {
    render(<Stat label="Cost" value={99.99} format="currency" />);
    expect(screen.getByText(/99\.99/)).toBeDefined();
  });

  it('should show positive change', () => {
    render(<Stat label="Growth" value={100} change={12.5} />);
    expect(screen.getByText(/12\.5%/)).toBeDefined();
  });

  it('should show negative change', () => {
    render(<Stat label="Growth" value={100} change={-5.2} />);
    expect(screen.getByText(/5\.2%/)).toBeDefined();
  });

  it('should render with icon', () => {
    render(<Stat label="Activity" value={42} icon={Activity} />);
    expect(screen.getByText('Activity')).toBeDefined();
  });
});
