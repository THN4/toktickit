import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RequesterDashboardPage from '../../src/pages/RequesterDashboardPage';
import MyTicketsPage from '../../src/pages/MyTicketsPage';
import * as api from '../../src/services/api';

vi.mock('../../src/services/api', async () => ({
  ...(await vi.importActual<typeof api>('../../src/services/api')),
  fetchRequesterDashboard: vi.fn(), fetchTickets: vi.fn(), fetchCategories: vi.fn(),
}));

const empty: api.RequesterDashboardData = { metrics: { openTickets: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 }, attentionTickets: [], recentTickets: [], recentlyResolvedTickets: [] };
const ticket: api.RequesterDashboardTicket = { ticketNumber: 'TKT-2026-000111', summary: 'VPN issue', currentStatus: 'WAITING_FOR_REQUESTER', itPriority: 'HIGH', updatedAt: '2026-10-03T10:00:00Z', resolvedAt: null, requesterResolvedAt: null };

describe('Lab 4 Requester Dashboard', () => {
  beforeEach(() => {
    vi.mocked(api.fetchRequesterDashboard).mockReset().mockResolvedValue(empty);
    vi.mocked(api.fetchTickets).mockReset().mockResolvedValue({ tickets: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } });
    vi.mocked(api.fetchCategories).mockReset().mockResolvedValue([]);
  });

  it('shows zero metrics and useful empty-state links', async () => {
    render(<MemoryRouter><RequesterDashboardPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'My Dashboard' })).toBeInTheDocument();
    const metrics = screen.getByRole('region', { name: 'Requester metrics' });
    expect(within(metrics).getByRole('link', { name: 'Waiting for You: 0' })).toHaveAttribute('href', '/my-tickets?status=WAITING_FOR_REQUESTER');
    expect(within(metrics).getByRole('link', { name: 'Recently Resolved: 0' })).toHaveAttribute('href', '/my-tickets?status=RESOLVED');
    expect(screen.getByRole('link', { name: 'Create a Ticket' })).toHaveAttribute('href', '/create-ticket');
  });

  it('renders attention/recent summaries with owned Ticket detail links', async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({ metrics: { openTickets: 1, waitingForRequester: 1, recentlyUpdated: 1, recentlyResolved: 0 }, attentionTickets: [ticket], recentTickets: [ticket], recentlyResolvedTickets: [] });
    render(<MemoryRouter><RequesterDashboardPage /></MemoryRouter>);
    expect(await screen.findAllByText('VPN issue')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: ticket.ticketNumber })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: ticket.ticketNumber })[0]).toHaveAttribute('href', `/tickets/${ticket.ticketNumber}`);
  });

  it('keeps a safe retry control after API failure', async () => {
    vi.mocked(api.fetchRequesterDashboard).mockRejectedValueOnce(new Error('Dashboard unavailable')).mockResolvedValueOnce(empty);
    render(<MemoryRouter><RequesterDashboardPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
    expect(await screen.findByRole('heading', { name: 'My Dashboard' })).toBeInTheDocument();
  });

  it('initializes My Tickets status from dashboard URL and ignores unsupported values', async () => {
    const view = render(<MemoryRouter initialEntries={['/my-tickets?status=WAITING_FOR_REQUESTER']}><MyTicketsPage /></MemoryRouter>);
    await waitFor(() => expect(api.fetchTickets).toHaveBeenCalledWith(expect.objectContaining({ status: 'WAITING_FOR_REQUESTER' })));
    expect(screen.getByLabelText('Status')).toHaveValue('WAITING_FOR_REQUESTER');
    view.unmount();
    render(<MemoryRouter initialEntries={['/my-tickets?status=INVALID']}><MyTicketsPage /></MemoryRouter>);
    await waitFor(() => expect(api.fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({ status: '' })));
  });
});
