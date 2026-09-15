import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchTickets,
  fetchCategories,
  type Ticket,
  type Category,
  type Pagination,
} from "../services/api";

type LoadState = "loading" | "success" | "error";

export default function MyTicketsPage() {

  // Reference Data
  const [categories, setCategories] = useState<Category[]>([]);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Sorting & Pagination State
  const [sortField, setSortField] = useState<"createdAt" | "updatedAt" | "ticketNumber">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data & Status State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Categories for dropdown
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Fetch Tickets Callback
  const loadTickets = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage("");

    try {
      const data = await fetchTickets({
        search: debouncedSearch,
        category: selectedCategory,
        requestedPriority: selectedPriority,
        status: selectedStatus,
        sort: sortField,
        order: sortOrder,
        page: currentPage,
        pageSize,
      });

      setTickets(data.tickets);
      setPagination(data.pagination);
      setLoadState("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to load tickets.";
      setErrorMessage(message);
      setLoadState("error");
    }
  }, [
    debouncedSearch,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    sortField,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Sorting handler
  function handleSort(field: "createdAt" | "updatedAt" | "ticketNumber") {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  }

  // Clear filters handler
  const hasActiveFilters = Boolean(
    search || selectedCategory || selectedPriority || selectedStatus
  );

  function handleClearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedStatus("");
    setCurrentPage(1);
  }

  // Badge helpers
  function getPriorityBadge(priority: string) {
    switch (priority) {
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-[#B91C1C]">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">MEDIUM</span>;
      case "LOW":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">{priority}</span>;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "NEW":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#EAF6EF] text-[#065F46] border border-[#D1E0D8]">NEW</span>;
      case "OPEN":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">OPEN</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">IN PROGRESS</span>;
      case "RESOLVED":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700 border border-green-200">RESOLVED</span>;
      case "CLOSED":
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">CLOSED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-700">{status}</span>;
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A2E22] mb-1">My Support Tickets</h1>
          <p className="text-sm text-[#4A6355]">
            View, track, and manage all your submitted IT tickets.
          </p>
        </div>
        <Link
          to="/create-ticket"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-[#006B3C] hover:bg-[#0B7A46] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start md:self-auto"
        >
          + Create Ticket
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#D1E0D8] shadow-sm mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-[#4A6355] mb-1">Search</label>
            <input
              type="text"
              aria-label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by summary or ticket #..."
              className="w-full text-sm border border-[#D1E0D8] rounded-lg px-3 py-2 text-[#1A2E22] focus:outline-none focus:ring-2 focus:ring-[#006B3C]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[#4A6355] mb-1">Category</label>
            <select
              aria-label="Category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-sm border border-[#D1E0D8] rounded-lg px-3 py-2 text-[#1A2E22] bg-white focus:outline-none focus:ring-2 focus:ring-[#006B3C]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-[#4A6355] mb-1">Priority</label>
            <select
              aria-label="Priority"
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-sm border border-[#D1E0D8] rounded-lg px-3 py-2 text-[#1A2E22] bg-white focus:outline-none focus:ring-2 focus:ring-[#006B3C]"
            >
              <option value="">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-[#4A6355] mb-1">Status</label>
            <select
              aria-label="Status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-sm border border-[#D1E0D8] rounded-lg px-3 py-2 text-[#1A2E22] bg-white focus:outline-none focus:ring-2 focus:ring-[#006B3C]"
            >
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>

        {/* Clear Filters (Visible only when filters are active per UI-10) */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              onClick={handleClearFilters}
              className="text-xs text-[#006B3C] hover:text-[#0B7A46] font-semibold flex items-center gap-1 cursor-pointer"
            >
              ✕ Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── State 1: Loading State ─────────────────────────────────────────── */}
      {loadState === "loading" && (
        <div className="bg-white rounded-xl border border-[#D1E0D8] p-12 text-center shadow-sm">
          <div className="inline-block animate-spin text-3xl mb-3">⏳</div>
          <p className="text-sm font-medium text-[#4A6355]">Loading your tickets…</p>
        </div>
      )}

      {/* ─── State 2: Error State ───────────────────────────────────────────── */}
      {loadState === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700 shadow-sm">
          <p className="font-semibold mb-2">{errorMessage}</p>
          <button
            onClick={loadTickets}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── State 3: Empty State (0 tickets ever created by this user) ──────── */}
      {loadState === "success" && pagination.totalItems === 0 && !hasActiveFilters && (
        <div className="bg-white rounded-xl border border-[#D1E0D8] p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">🎫</div>
          <h3 className="text-lg font-bold text-[#1A2E22] mb-1">No tickets submitted yet</h3>
          <p className="text-sm text-[#4A6355] mb-6">
            You haven't submitted any support requests. If you need help with IT services, create a ticket!
          </p>
          <Link
            to="/create-ticket"
            className="inline-flex items-center px-5 py-2.5 bg-[#006B3C] hover:bg-[#0B7A46] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            Create Your First Ticket
          </Link>
        </div>
      )}

      {/* ─── State 4: No-Results State (Active filters matched 0 tickets) ─────── */}
      {loadState === "success" && pagination.totalItems === 0 && hasActiveFilters && (
        <div className="bg-white rounded-xl border border-[#D1E0D8] p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-bold text-[#1A2E22] mb-1">No tickets match your filters</h3>
          <p className="text-sm text-[#4A6355] mb-5">
            Try adjusting your search keyword or clearing the active filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 border border-[#D1E0D8] text-[#1A2E22] hover:bg-gray-50 rounded-lg text-xs font-medium cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ─── Data Display: Desktop Table + Mobile Cards ─────────────────────── */}
      {loadState === "success" && tickets.length > 0 && (
        <div className="space-y-4">
          {/* Desktop Table (hidden on mobile < 768px per VIS-03 / VIS-05) */}
          <div className="hidden md:block bg-white rounded-xl border border-[#D1E0D8] shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F0F4F1] border-b border-[#D1E0D8] text-[#4A6355] text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th
                    onClick={() => handleSort("ticketNumber")}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#1A2E22]"
                  >
                    Ticket # {sortField === "ticketNumber" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    onClick={() => handleSort("createdAt")}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#1A2E22]"
                  >
                    Created {sortField === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="py-3.5 px-4">Summary</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th
                    onClick={() => handleSort("updatedAt")}
                    className="py-3.5 px-4 cursor-pointer hover:text-[#1A2E22]"
                  >
                    Updated {sortField === "updatedAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[#1A2E22]">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F5F7F6] transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#006B3C]">
                      <Link to={`/tickets/${t.ticketNumber}`} className="hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#4A6355] whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-medium max-w-xs truncate" title={t.summary}>
                      {t.summary}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#4A6355]">
                      {t.category?.name || "-"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getPriorityBadge(t.requestedPriority)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(t.currentStatus)}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#4A6355] whitespace-nowrap">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (stacked cards for mobile < 768px per VIS-05 / AC-22) */}
          <div className="md:hidden space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="bg-white p-4 rounded-xl border border-[#D1E0D8] shadow-sm space-y-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <Link to={`/tickets/${t.ticketNumber}`} className="font-mono font-bold text-[#006B3C] text-sm hover:underline">
                    {t.ticketNumber}
                  </Link>
                  {getStatusBadge(t.currentStatus)}
                </div>
                <h4 className="font-semibold text-[#1A2E22]">{t.summary}</h4>
                <div className="flex items-center justify-between text-xs text-[#4A6355] pt-1">
                  <span>Category: <strong>{t.category?.name}</strong></span>
                  <span>{getPriorityBadge(t.requestedPriority)}</span>
                </div>
                <div className="text-xs text-[#4A6355] pt-1 border-t border-gray-100 flex justify-between">
                  <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                  <span>Updated: {new Date(t.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#4A6355]">
            <div>
              Showing{" "}
              <span className="font-semibold text-[#1A2E22]">
                {pagination.totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#1A2E22]">
                {Math.min(currentPage * pageSize, pagination.totalItems)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#1A2E22]">{pagination.totalItems}</span>{" "}
              tickets
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs">Rows per page:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-[#D1E0D8] rounded px-2 py-1 bg-white text-[#1A2E22] text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 border border-[#D1E0D8] rounded bg-white text-[#1A2E22] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-2 font-medium text-[#1A2E22]">
                  {currentPage} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))}
                  disabled={currentPage >= pagination.totalPages}
                  className="px-2.5 py-1 border border-[#D1E0D8] rounded bg-white text-[#1A2E22] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
