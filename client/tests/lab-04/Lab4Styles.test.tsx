import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardRow, MetricCard } from '../../src/components/DashboardParts';

describe('Lab 4 visual contract', () => {
  it('keeps dashboard metrics in Zen Green with a visible keyboard focus style', () => {
    render(<MemoryRouter><MetricCard label="HIGH IT Priority" value={3} to="/staff/tickets?itPriority=HIGH" /></MemoryRouter>);
    const metric = screen.getByRole('link', { name: 'HIGH IT Priority: 3' });
    expect(metric).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-[#006B3C]');
    expect(metric.querySelector('strong')).toHaveClass('text-[#006B3C]');
    expect(metric).toHaveAttribute('href', '/staff/tickets?itPriority=HIGH');
  });

  it('keeps ticket number, summary, status and priority readable as text in linked rows', () => {
    render(<MemoryRouter><ul><DashboardRow to="/staff/tickets/TKT-2026-000001" title="TKT-2026-000001" subtitle="Network unavailable" detail="WAITING FOR REQUESTER · HIGH priority" /></ul></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'TKT-2026-000001' })).toHaveClass('break-all');
    expect(screen.getByText('Network unavailable')).toBeVisible();
    expect(screen.getByText('WAITING FOR REQUESTER · HIGH priority')).toBeVisible();
  });
});
