import { useCallback, useEffect, useState } from 'react';
import { DashboardError, DashboardLoading, DashboardPanel, DashboardRow, MetricCard } from '../components/DashboardParts';
import { useAuth } from '../contexts/AuthContext';
import { fetchStaffDashboard, type FormalStatus, type StaffDashboardAction, type StaffDashboardData, type StaffDashboardTicket, type TicketPriority } from '../services/api';

const statuses: FormalStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const ticketLink = (number: string) => `/staff/tickets/${encodeURIComponent(number)}`;
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value));

function TicketRows({ items }: { items: StaffDashboardTicket[] }) {
  return items.map((ticket) => <DashboardRow key={ticket.ticketNumber} to={ticketLink(ticket.ticketNumber)} title={ticket.ticketNumber} subtitle={ticket.summary} detail={`${ticket.currentStatus.replaceAll('_', ' ')} · ${ticket.itPriority} priority · ${ticket.ticketOwner?.name ?? 'Unassigned'} · Updated ${dateLabel(ticket.updatedAt)}`} />);
}

function ActionRows({ items }: { items: StaffDashboardAction[] }) {
  return items.map((action) => <DashboardRow key={action.id} to={ticketLink(action.ticketNumber)} title={action.ticketNumber} subtitle={action.description} detail={`${action.status.replaceAll('_', ' ')} · ${action.assignee?.name ?? 'Unassigned'} · ${action.completedAt ? `Completed ${dateLabel(action.completedAt)}` : `Updated ${dateLabel(action.updatedAt)}`}`} />);
}

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setData(await fetchStaffDashboard()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load Staff dashboard.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (error) return <DashboardError message={error} retry={() => void load()} />;
  if (!data) return <DashboardLoading />;
  const metrics = data.metrics;
  return <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
    <header><h1 className="text-2xl font-bold text-[#1A2E22]">Staff Dashboard</h1><p className="mt-1 text-sm text-[#4A6355]">Operational Tickets and current work for {user?.name ?? 'your team'}.</p></header>
    <section aria-label="Staff metrics" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Unassigned Tickets" value={metrics.unassignedTickets} to="/staff/tickets?ownerState=unassigned" />
      <MetricCard label="My Open Tickets" value={metrics.myOwnedTickets} to={user ? `/staff/tickets?ownerId=${user.id}` : '/staff/tickets'} />
      <MetricCard label="Updated in 30 Days" value={metrics.recentlyUpdated} to="/staff/tickets" hint="View Queue; count covers the last 30 days" />
      <MetricCard label="My Assigned Actions" value={metrics.myAssignedActions} to="/staff/dashboard#assigned-actions" hint="Jump to assigned work below" />
      <MetricCard label="My Completed Actions in 30 Days" value={metrics.myCompletedActions30d} to="/staff/dashboard#completed-actions" hint="Jump to completed work below" />
    </section>
    <section aria-label="Tickets by status" className="mt-5"><h2 className="mb-3 text-lg font-bold text-[#1A2E22]">Tickets by Status</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{statuses.map((status) => <MetricCard key={status} label={status.replaceAll('_', ' ')} value={metrics.byStatus[status]} to={`/staff/tickets?status=${status}`} />)}</div></section>
    <section aria-label="Tickets by IT priority" className="mt-5"><h2 className="mb-3 text-lg font-bold text-[#1A2E22]">Active Tickets by IT Priority</h2><div className="grid gap-3 sm:grid-cols-3">{priorities.map((priority) => <MetricCard key={priority} label={`${priority} IT Priority`} value={metrics.byItPriority[priority]} to={`/staff/tickets?itPriority=${priority}`} hint="Queue includes all statuses" />)}</div></section>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <DashboardPanel title="Recent Tickets" empty={!data.recentTickets.length} emptyTo="/staff/tickets" emptyLabel="View Queue"><TicketRows items={data.recentTickets} /></DashboardPanel>
      <DashboardPanel title="High Priority Tickets" empty={!data.highPriorityTickets.length} emptyTo="/staff/tickets?itPriority=HIGH" emptyLabel="View high-priority Queue"><TicketRows items={data.highPriorityTickets} /></DashboardPanel>
      <div id="assigned-actions"><DashboardPanel title="My Assigned Actions" empty={!data.myAssignedActionItems.length} emptyTo="/staff/tickets" emptyLabel="View Queue"><ActionRows items={data.myAssignedActionItems} /></DashboardPanel></div>
      <div id="completed-actions"><DashboardPanel title="My Recent Completed Actions" empty={!data.recentMyCompletedActions.length} emptyTo="/staff/tickets" emptyLabel="View Queue"><ActionRows items={data.recentMyCompletedActions} /></DashboardPanel></div>
    </div>
  </main>;
}
