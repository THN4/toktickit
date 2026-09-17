import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStaffQueue, type StaffQueueItem, type StaffQueueParams } from "../services/api";

type SortField = NonNullable<StaffQueueParams["sort"]>;
type SortOrder = NonNullable<StaffQueueParams["order"]>;

const statuses = ["", "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const priorities = ["", "LOW", "MEDIUM", "HIGH"];

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#294536]">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-lg border border-[#B8CEC0] bg-white px-3 text-sm text-[#1A2E22] focus:border-[#006B3C] focus:outline-none focus:ring-2 focus:ring-[#006B3C]/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "blue" | "neutral" }) {
  const tones = {
    green: "bg-[#DCFCE7] text-[#166534]",
    amber: "bg-[#FEF3C7] text-[#92400E]",
    red: "bg-[#FEE2E2] text-[#991B1B]",
    blue: "bg-[#DBEAFE] text-[#1D4ED8]",
    neutral: "bg-[#E9F0EB] text-[#355443]",
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function priorityTone(priority: string): "green" | "amber" | "red" {
  if (priority === "HIGH") return "red";
  if (priority === "MEDIUM") return "amber";
  return "green";
}

function statusTone(status: string): "green" | "amber" | "blue" | "neutral" {
  if (status === "RESOLVED" || status === "CLOSED") return "green";
  if (status === "NEW") return "blue";
  if (status === "IN_PROGRESS") return "amber";
  return "neutral";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function StaffQueuePage() {
  const [items, setItems] = useState<StaffQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [itPriority, setItPriority] = useState("");
  const [ownerState, setOwnerState] = useState<"" | "assigned" | "unassigned">("");
  const [ownerId, setOwnerId] = useState("");
  const [sort, setSort] = useState<SortField>("updatedAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const queueParams: StaffQueueParams = {
    search,
    status,
    requestedPriority,
    itPriority,
    ownerState: ownerState || undefined,
    ownerId: ownerId ? Number(ownerId) : undefined,
    sort,
    order,
    page,
    pageSize,
  };

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStaffQueue(queueParams);
      setItems(data.items);
      setTotalItems(data.pagination.totalItems);
      setTotalPages(data.pagination.totalPages);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to fetch the IT Staff Queue.");
    } finally {
      setLoading(false);
    }
  }, [
    search,
    status,
    requestedPriority,
    itPriority,
    ownerState,
    ownerId,
    sort,
    order,
    page,
    pageSize,
  ]);

  useEffect(() => {
    const debounce = window.setTimeout(() => void loadQueue(), 250);
    return () => window.clearTimeout(debounce);
  }, [loadQueue]);

  const updateFilter = (update: (value: string) => void) => (value: string) => {
    update(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setRequestedPriority("");
    setItPriority("");
    setOwnerState("");
    setOwnerId("");
    setPage(1);
  };

  const toggleSort = (field: SortField) => {
    if (field === sort) {
      setOrder((current) => (current === "desc" ? "asc" : "desc"));
    } else {
      setSort(field);
      setOrder("desc");
    }
    setPage(1);
  };

  const activeFilters = Boolean(search || status || requestedPriority || itPriority || ownerState || ownerId);
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  const sortButton = (label: string, field: SortField) => (
    <button type="button" onClick={() => toggleSort(field)} className="inline-flex items-center gap-1 text-left font-semibold hover:text-[#006B3C] focus:outline-none focus:underline">
      {label}
      <span aria-label={sort === field ? `${order}ending` : "not sorted"}>{sort === field ? (order === "desc" ? "↓" : "↑") : "↕"}</span>
    </button>
  );

  const renderTicket = (ticket: StaffQueueItem) => (
    <article key={ticket.id} className="rounded-xl border border-[#D1E0D8] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link to={`/staff/tickets/${ticket.ticketNumber}`} className="font-mono text-sm font-bold text-[#006B3C] underline-offset-2 hover:underline">
            {ticket.ticketNumber}
          </Link>
          <h2 className="mt-1 break-words font-semibold text-[#1A2E22]">{ticket.summary}</h2>
        </div>
        <Badge tone={statusTone(ticket.currentStatus)}>{ticket.currentStatus}</Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-sm text-[#4A6355]">
        <div><dt className="inline font-medium text-[#294536]">Requester: </dt><dd className="inline">{ticket.requester.name}</dd></div>
        <div><dt className="inline font-medium text-[#294536]">Owner: </dt><dd className="inline">{ticket.ticketOwner?.name ?? "Unassigned"}</dd></div>
        <div><dt className="inline font-medium text-[#294536]">Updated: </dt><dd className="inline">{formatDate(ticket.updatedAt)}</dd></div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={priorityTone(ticket.requestedPriority)}>Requested: {ticket.requestedPriority}</Badge>
        <Badge tone={priorityTone(ticket.itPriority)}>IT: {ticket.itPriority}</Badge>
        <Badge tone={ticket.ticketOwner ? "green" : "neutral"}>{ticket.ticketOwner ? "Assigned" : "Unassigned"}</Badge>
      </div>
      <Link to={`/staff/tickets/${ticket.ticketNumber}`} className="mt-4 inline-flex rounded-lg bg-[#006B3C] px-3 py-2 text-sm font-semibold text-white hover:bg-[#00532E] focus:outline-none focus:ring-2 focus:ring-[#006B3C] focus:ring-offset-2">
        Open Ticket
      </Link>
    </article>
  );

  return (
    <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A2E22]">My Queue</h1>
          <p className="mt-1 text-sm text-[#4A6355]">Review and triage IT support tickets.</p>
        </div>
        <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="rounded-lg border border-[#8EAD99] bg-white px-3 py-2 text-sm font-semibold text-[#1A2E22] md:hidden">
          {filtersOpen ? "Hide filters" : "Filters"}
        </button>
      </header>

      <section aria-label="Queue filters" className={`${filtersOpen ? "grid" : "hidden"} gap-3 rounded-xl border border-[#D1E0D8] bg-[#F8FBF8] p-4 md:grid md:grid-cols-2 lg:grid-cols-4`}>
        <label className="grid gap-1 text-sm font-medium text-[#294536] md:col-span-2">
          Search
          <input aria-label="Search" value={search} onChange={(event) => updateFilter(setSearch)(event.target.value)} placeholder="Search ticket, requester, owner…" className="min-h-10 rounded-lg border border-[#B8CEC0] bg-white px-3 text-sm focus:border-[#006B3C] focus:outline-none focus:ring-2 focus:ring-[#006B3C]/20" />
        </label>
        <Select label="Status" value={status} onChange={updateFilter(setStatus)} options={statuses.map((value) => ({ value, label: value || "All statuses" }))} />
        <Select label="Requested priority" value={requestedPriority} onChange={updateFilter(setRequestedPriority)} options={priorities.map((value) => ({ value, label: value || "All requested priorities" }))} />
        <Select label="IT priority" value={itPriority} onChange={updateFilter(setItPriority)} options={priorities.map((value) => ({ value, label: value || "All IT priorities" }))} />
        <Select label="Owner state" value={ownerState} onChange={updateFilter((value) => setOwnerState(value as "" | "assigned" | "unassigned"))} options={[{ value: "", label: "All owners" }, { value: "unassigned", label: "Unassigned" }, { value: "assigned", label: "Assigned" }]} />
        <label className="grid gap-1 text-sm font-medium text-[#294536]">
          Owner ID
          <input aria-label="Owner ID" value={ownerId} inputMode="numeric" onChange={(event) => updateFilter(setOwnerId)(event.target.value)} placeholder="Any owner ID" className="min-h-10 rounded-lg border border-[#B8CEC0] bg-white px-3 text-sm focus:border-[#006B3C] focus:outline-none focus:ring-2 focus:ring-[#006B3C]/20" />
        </label>
        <Select label="Sort by" value={sort} onChange={(value) => { setSort(value as SortField); setPage(1); }} options={[
          { value: "updatedAt", label: "Updated" }, { value: "createdAt", label: "Created" }, { value: "ticketNumber", label: "Ticket number" },
          { value: "currentStatus", label: "Status" }, { value: "requestedPriority", label: "Requested priority" }, { value: "itPriority", label: "IT priority" },
        ]} />
        <Select label="Sort order" value={order} onChange={(value) => { setOrder(value as SortOrder); setPage(1); }} options={[{ value: "desc", label: "Descending" }, { value: "asc", label: "Ascending" }]} />
        <Select label="Page size" value={pageSize} onChange={(value) => { setPageSize(Number(value)); setPage(1); }} options={[10, 25, 50].map((value) => ({ value: String(value), label: `${value} per page` }))} />
        <div className="flex items-end">
          <button type="button" onClick={clearFilters} disabled={!activeFilters} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#006B3C] hover:bg-[#E8F3EA] disabled:cursor-not-allowed disabled:text-[#789080]">
            Clear filters
          </button>
        </div>
      </section>

      <section className="mt-5" aria-live="polite">
        {loading && <div className="grid gap-3"><p className="sr-only">Loading Queue…</p>{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-[#E9F0EB]" />)}</div>}
        {!loading && error && <div role="alert" className="rounded-xl border border-[#F5B8B8] bg-[#FFF1F1] p-4 text-[#991B1B]"><p>{error}</p><button type="button" onClick={() => void loadQueue()} className="mt-2 font-semibold underline underline-offset-2">Retry</button></div>}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#B8CEC0] bg-white p-8 text-center">
            <p className="font-medium text-[#1A2E22]">{activeFilters ? "No Tickets match the current search or filters." : "No Tickets are currently in the queue."}</p>
            {activeFilters && <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-[#006B3C] underline underline-offset-2">Clear filters</button>}
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-[#D1E0D8] bg-white md:block">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="bg-[#EFF6F0] text-[#294536]"><tr>
                  <th className="p-3">{sortButton("No.", "ticketNumber")}</th><th className="p-3">{sortButton("Updated", "updatedAt")}</th><th className="p-3">Summary</th><th className="p-3">Requester</th><th className="p-3">Owner</th><th className="p-3">{sortButton("Req. priority", "requestedPriority")}</th><th className="p-3">{sortButton("IT priority", "itPriority")}</th><th className="p-3">{sortButton("Status", "currentStatus")}</th><th className="p-3"><span className="sr-only">Open</span></th>
                </tr></thead>
                <tbody>{items.map((ticket) => <tr key={ticket.id} className="border-t border-[#E1EBE4] align-top text-[#294536]">
                  <td className="p-3 font-mono font-semibold text-[#006B3C]"><Link to={`/staff/tickets/${ticket.ticketNumber}`} className="hover:underline">{ticket.ticketNumber}</Link></td><td className="p-3 whitespace-nowrap">{formatDate(ticket.updatedAt)}</td><td className="max-w-56 p-3 font-medium text-[#1A2E22]">{ticket.summary}</td><td className="p-3">{ticket.requester.name}<span className="block text-xs text-[#4A6355]">{ticket.requester.email}</span></td><td className="p-3"><Badge tone={ticket.ticketOwner ? "green" : "neutral"}>{ticket.ticketOwner?.name ?? "Unassigned"}</Badge></td><td className="p-3"><Badge tone={priorityTone(ticket.requestedPriority)}>{ticket.requestedPriority}</Badge></td><td className="p-3"><Badge tone={priorityTone(ticket.itPriority)}>{ticket.itPriority}</Badge></td><td className="p-3"><Badge tone={statusTone(ticket.currentStatus)}>{ticket.currentStatus}</Badge></td><td className="p-3"><Link to={`/staff/tickets/${ticket.ticketNumber}`} className="whitespace-nowrap rounded-lg bg-[#006B3C] px-3 py-2 font-semibold text-white hover:bg-[#00532E]">Open</Link></td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">{items.map(renderTicket)}</div>
          </>
        )}
      </section>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#4A6355]">
        <span>Showing {rangeStart} to {rangeEnd} of {totalItems}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-[#B8CEC0] bg-white px-3 py-2 font-semibold text-[#294536] disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
          <span aria-label="Current page">Page {page} of {Math.max(1, totalPages)}</span>
          <button type="button" disabled={page >= totalPages || loading || totalItems === 0} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[#B8CEC0] bg-white px-3 py-2 font-semibold text-[#294536] disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </footer>
    </main>
  );
}
