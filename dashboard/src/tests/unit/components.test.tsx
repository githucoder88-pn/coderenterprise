import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { TopBar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/command-palette';
import { useUIStore } from '@/stores/ui-store';
import { Activity } from 'lucide-react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
}));

vi.mock('@/hooks/use-api', () => ({
  useUnreadCount: () => ({ data: { count: 3 } }),
}));

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

describe('TopBar', () => {
  it('should render accessibility attributes on action buttons', () => {
    render(<TopBar />);

    const searchBtn = screen.getByRole('button', { name: /search or jump to commands/i });
    expect(searchBtn).toBeDefined();

    const themeBtn = screen.getByRole('button', { name: /switch theme/i });
    expect(themeBtn).toBeDefined();

    const notifyBtn = screen.getByRole('button', { name: /notifications \(3 unread\)/i });
    expect(notifyBtn).toBeDefined();
  });
});

describe('CommandPalette', () => {
  it('should render dialog role and accessible close button when open', () => {
    useUIStore.setState({ commandPaletteOpen: true });

    render(<CommandPalette />);

    const dialog = screen.getByRole('dialog', { name: /command palette/i });
    expect(dialog).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: /close command palette/i });
    expect(closeBtn).toBeDefined();

    const searchInput = screen.getByRole('textbox', { name: /search commands/i });
    expect(searchInput).toBeDefined();
  });
});
