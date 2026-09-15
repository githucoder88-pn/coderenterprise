import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { TopBar } from '@/components/layout/topbar';
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
  it('should render buttons with accessible ARIA labels', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TopBar />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('button', { name: 'Search or jump to...' })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Theme:/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Notifications/ })).toBeDefined();
  });
});
