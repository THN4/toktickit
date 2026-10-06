import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardError, DashboardLoading, DashboardPanel, DashboardRow, MetricCard } from '../components/DashboardParts';
import { fetchRequesterDashboard, type RequesterDashboardData, type RequesterDashboardTicket } from '../services/api';

function TicketRows({ items, dateField = 'updatedAt' }: { items: RequesterDashboardTicket[]; dateField?: 'updatedAt' | 'resolvedAt' }) {
  return items.map((ticket) => <DashboardRow key={ticket.ticketNumber} to={`/tickets/${encodeURIComponent(ticket.ticketNumber)}`} title={ticket.ticketNumber} subtitle={ticket.summary} detail={`${ticket.currentStatus.replaceAll('_', ' ')} · IT Priority ${ticket.itPriority} · ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(ticket[dateField] ?? ticket.updatedAt))}`} />);
}

export default function RequesterDashboardPage() {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setData(await fetchRequesterDashboard()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load Requester dashboard.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (error) return <DashboardError message={error} retry={() => void load()} />;
  if (!data) return <DashboardLoading />;

  return <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-[#1A2E22]">My Dashboard</h1><p className="mt-1 text-sm text-[#4A6355]">A quick view of your support Tickets.</p></div><Link to="/create-ticket" className="rounded-lg bg-[#006B3C] px-4 py-3 text-sm font-semibold text-white">Create Ticket</Link></header>
    <section aria-label="Requester metrics" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Open Tickets" value={data.metrics.openTickets} to="/my-tickets" hint="View all Tickets" />
      <MetricCard label="Waiting for You" value={data.metrics.waitingForRequester} to="/my-tickets?status=WAITING_FOR_REQUESTER" />
      <MetricCard label="Updated in 30 Days" value={data.metrics.recentlyUpdated} to="/my-tickets" hint="View all Tickets" />
      <MetricCard label="Recently Resolved" value={data.metrics.recentlyResolved} to="/my-tickets?status=RESOLVED" />
    </section>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <DashboardPanel title="Attention Needed" empty={!data.attentionTickets.length} emptyTo="/my-tickets" emptyLabel="View My Tickets"><TicketRows items={data.attentionTickets} /></DashboardPanel>
      <DashboardPanel title="Recent Activity" empty={!data.recentTickets.length} emptyTo="/create-ticket" emptyLabel="Create a Ticket"><TicketRows items={data.recentTickets} /></DashboardPanel>
      <DashboardPanel title="Recently Resolved" empty={!data.recentlyResolvedTickets.length} emptyTo="/my-tickets?status=RESOLVED" emptyLabel="View resolved Tickets"><TicketRows items={data.recentlyResolvedTickets} dateField="resolvedAt" /></DashboardPanel>
    </div>
  </main>;
}
