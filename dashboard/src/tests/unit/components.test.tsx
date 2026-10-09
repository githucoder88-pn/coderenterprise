import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { CommandPalette } from '@/components/command-palette';
import { useUIStore } from '@/stores/ui-store';
import { Activity } from 'lucide-react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
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

describe('CommandPalette', () => {
  it('should not render dialog when closed', () => {
    useUIStore.setState({ commandPaletteOpen: false });
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render dialog and options when open with keyboard accessibility', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const dialog = screen.getByRole('dialog', { name: 'Command palette' });
    expect(dialog).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Search commands' });
    expect(input).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);

    // Arrow down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);

    // Arrow up
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });
});
