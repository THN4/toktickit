import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffDashboardPage from '../../src/pages/StaffDashboardPage';
import StaffQueuePage from '../../src/pages/StaffQueuePage';
import * as api from '../../src/services/api';

vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 42, name: 'Nina Staff', role: 'IT_STAFF' } }) }));
vi.mock('../../src/services/api', async () => ({
  ...(await vi.importActual<typeof api>('../../src/services/api')),
  fetchStaffDashboard: vi.fn(), fetchStaffQueue: vi.fn(),
}));

const zeros: api.StaffDashboardData = {
  metrics: {
    unassignedTickets: 0, myOwnedTickets: 0, recentlyUpdated: 0, myAssignedActions: 0, myCompletedActions30d: 0,
    byStatus: { NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 },
    byItPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 },
  },
  recentTickets: [], highPriorityTickets: [], myAssignedActionItems: [], recentMyCompletedActions: [],
};
const ticket: api.StaffDashboardTicket = { ticketNumber: 'TKT-2026-000222', summary: 'Server unavailable', currentStatus: 'OPEN', itPriority: 'HIGH', ticketOwner: null, updatedAt: '2026-10-03T10:00:00Z' };
const action: api.StaffDashboardAction = { id: 9, ticketNumber: ticket.ticketNumber, status: 'PLANNED', description: 'Restart service', assignee: { id: 42, name: 'Nina Staff' }, performedBy: null, actionAt: '2026-10-03T10:00:00Z', completedAt: null, updatedAt: '2026-10-03T10:00:00Z' };

describe('Lab 4 Staff Dashboard', () => {
  beforeEach(() => {
    vi.mocked(api.fetchStaffDashboard).mockReset().mockResolvedValue(zeros);
    vi.mocked(api.fetchStaffQueue).mockReset().mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
  });

  it('renders all zero categories with Queue-compatible drill-downs and empty states', async () => {
    render(<MemoryRouter><StaffDashboardPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Staff Dashboard' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Staff metrics' })).getByRole('link', { name: 'My Open Tickets: 0' })).toHaveAttribute('href', '/staff/tickets?ownerId=42');
    expect(screen.getByRole('link', { name: 'Unassigned Tickets: 0' })).toHaveAttribute('href', '/staff/tickets?ownerState=unassigned');
    expect(within(screen.getByRole('region', { name: 'Tickets by status' })).getAllByRole('link')).toHaveLength(8);
    expect(within(screen.getByRole('region', { name: 'Tickets by IT priority' })).getAllByRole('link')).toHaveLength(3);
    expect(screen.getAllByText(/No matching items right now/)).toHaveLength(4);
  });

  it('links recent tickets and current-user actions to Ticket detail', async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue({ ...zeros, metrics: { ...zeros.metrics, myAssignedActions: 1 }, recentTickets: [ticket], highPriorityTickets: [ticket], myAssignedActionItems: [action] });
    render(<MemoryRouter><StaffDashboardPage /></MemoryRouter>);
    expect(await screen.findByText('Restart service')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: ticket.ticketNumber })).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: ticket.ticketNumber })[0]).toHaveAttribute('href', `/staff/tickets/${ticket.ticketNumber}`);
  });

  it('shows a safe retry after API failure', async () => {
    vi.mocked(api.fetchStaffDashboard).mockRejectedValueOnce(new Error('Temporarily unavailable')).mockResolvedValueOnce(zeros);
    render(<MemoryRouter><StaffDashboardPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporarily unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Staff Dashboard' })).toBeInTheDocument();
  });

  it('initializes supported Queue filters from dashboard URLs', async () => {
    render(<MemoryRouter initialEntries={['/staff/tickets?status=OPEN&itPriority=HIGH&ownerState=unassigned']}><StaffQueuePage /></MemoryRouter>);
    await waitFor(() => expect(api.fetchStaffQueue).toHaveBeenCalledWith(expect.objectContaining({ status: 'OPEN', itPriority: 'HIGH', ownerState: 'unassigned' })));
    expect(screen.getByLabelText('Status')).toHaveValue('OPEN');
    expect(screen.getByLabelText('IT priority')).toHaveValue('HIGH');
    expect(screen.getByLabelText('Owner state')).toHaveValue('unassigned');
  });
});
