import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffQueuePage from "../../src/pages/StaffQueuePage";
import * as api from "../../src/services/api";

vi.mock("../../src/services/api", async () => ({
  ...(await vi.importActual<typeof api>("../../src/services/api")),
  fetchStaffQueue: vi.fn(),
}));

const emptyQueue = {
  items: [],
  pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
};

const queueItem = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 8,
  categoryId: 2,
  relatedSystemId: 3,
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  summary: "Printer is unavailable",
  description: "The office printer does not respond.",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-02T09:00:00.000Z",
  requester: { id: 8, name: "Ina Patel", email: "ina.patel@example.test" },
  ticketOwner: null,
};

function renderQueue() {
  return render(<MemoryRouter><StaffQueuePage /></MemoryRouter>);
}

describe("Lab 3 Staff Queue UI", () => {
  beforeEach(() => {
    vi.mocked(api.fetchStaffQueue).mockReset();
    vi.mocked(api.fetchStaffQueue).mockResolvedValue(emptyQueue);
  });

  it("keeps documented controls stable while loading", async () => {
    let resolveQueue: (value: typeof emptyQueue) => void = () => undefined;
    vi.mocked(api.fetchStaffQueue).mockImplementationOnce(() => new Promise((resolve) => { resolveQueue = resolve; }));

    renderQueue();

    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner state")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Loading Queue…")).toBeInTheDocument());
    await waitFor(() => expect(api.fetchStaffQueue).toHaveBeenCalledTimes(1));

    resolveQueue(emptyQueue);
    await waitFor(() => expect(screen.getByText("No Tickets are currently in the queue.")).toBeInTheDocument());
  });

  it("renders all Queue filters and sends a debounced search query", async () => {
    renderQueue();

    await waitFor(() => expect(screen.getByText("No Tickets are currently in the queue.")).toBeInTheDocument());
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Requested priority")).toBeInTheDocument();
    expect(screen.getByLabelText("IT priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Page size")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "printer" } });
    await waitFor(() => expect(api.fetchStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ search: "printer", page: 1, pageSize: 10 })));
  });

  it("shows the documented no-results feedback and clears filters", async () => {
    renderQueue();
    await waitFor(() => expect(screen.getByText("No Tickets are currently in the queue.")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "not found" } });
    await waitFor(() => expect(screen.getByText("No Tickets match the current search or filters.")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Clear filters" }).at(-1)!);
    await waitFor(() => expect(screen.getByText("No Tickets are currently in the queue.")).toBeInTheDocument());
  });

  it("shows a safe error and retries the Queue request", async () => {
    vi.mocked(api.fetchStaffQueue)
      .mockRejectedValueOnce(new Error("Service unavailable"))
      .mockResolvedValueOnce(emptyQueue);

    renderQueue();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable"));

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("No Tickets are currently in the queue.")).toBeInTheDocument());
    expect(api.fetchStaffQueue).toHaveBeenCalledTimes(2);
  });

  it("renders Queue badges, an Open action, sorting, and pagination", async () => {
    vi.mocked(api.fetchStaffQueue).mockImplementation(async (params) => ({
      items: [queueItem],
      pagination: { page: params.page ?? 1, pageSize: params.pageSize ?? 10, totalItems: 20, totalPages: 2 },
    }));

    renderQueue();
    await waitFor(() => expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Requested: HIGH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Open Ticket" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Showing 1 to 10 of 20")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Updated/ }));
    await waitFor(() => expect(api.fetchStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "updatedAt", order: "asc" })));

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(api.fetchStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(screen.getByText("Showing 11 to 20 of 20")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Page size"), { target: { value: "25" } });
    await waitFor(() => expect(api.fetchStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 25 })));
  });
});
