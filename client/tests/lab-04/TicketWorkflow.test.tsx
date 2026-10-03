import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTicketDetailPage from "../../src/pages/StaffTicketDetailPage";
import * as api from "../../src/services/api";

vi.mock("../../src/services/api", async () => ({
  ...(await vi.importActual<typeof api>("../../src/services/api")),
  fetchStaffTicketDetail: vi.fn(), fetchStaffOwners: vi.fn(), fetchActionsTaken: vi.fn(), fetchActionAssignees: vi.fn(),
  updateFormalStatus: vi.fn(), updateItPriority: vi.fn(), updateTicketOwner: vi.fn(), claimStaffTicket: vi.fn(),
}));

const ticket: api.StaffTicketDetail = {
  id: 9, ticketNumber: "TKT-2026-000009", requesterId: 2, categoryId: 1, relatedSystemId: 1,
  requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", version: 7, resolvedAt: null,
  summary: "VPN unavailable", description: "Cannot sign in", createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-02T00:00:00Z", requesterResolvedAt: null,
  requester: { id: 2, name: "Requester", email: "requester@example.test" }, ticketOwner: null,
  category: { id: 1, name: "Network" }, relatedSystem: { id: 1, name: "VPN" },
  attachments: [], publicComments: [], internalNotes: [],
};

function renderPage(role: "IT_STAFF" | "ADMINISTRATOR" = "IT_STAFF") {
  render(<MemoryRouter initialEntries={[`/staff/tickets/${ticket.ticketNumber}`]}><Routes><Route path="/staff/tickets/:ticketNumber" element={<StaffTicketDetailPage role={role} />} /></Routes></MemoryRouter>);
}

describe("Lab 4 Ticket workflow UI", () => {
  beforeEach(() => {
    vi.mocked(api.fetchStaffTicketDetail).mockReset().mockResolvedValue(ticket);
    vi.mocked(api.fetchStaffOwners).mockReset().mockResolvedValue([]);
    vi.mocked(api.fetchActionsTaken).mockReset().mockResolvedValue([]);
    vi.mocked(api.fetchActionAssignees).mockReset().mockResolvedValue([]);
    vi.mocked(api.updateFormalStatus).mockReset();
    vi.mocked(api.updateItPriority).mockReset();
  });

  it("shows only allowed edges, complete resolve guidance and Ticket-number confirmation", async () => {
    vi.mocked(api.updateFormalStatus).mockResolvedValue({ ...ticket, currentStatus: "RESOLVED", version: 8, resolvedAt: "2026-10-03T00:00:00Z" });
    renderPage();
    const select = await screen.findByLabelText("Formal status");
    expect(within(select).getByRole("option", { name: "RESOLVED" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "CLOSED" })).not.toBeInTheDocument();
    expect(screen.getByText(/complete at least one Action Taken with a result/i)).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "RESOLVED" } });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("TKT-2026-000009");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.updateFormalStatus).toHaveBeenCalledWith(ticket.ticketNumber, "RESOLVED", 7, true));
    const resolvedLabel = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date("2026-10-03T00:00:00Z"));
    expect(await screen.findByText(resolvedLabel)).toBeInTheDocument();
  });

  it("keeps a priority selection after a stale write and offers a version refresh", async () => {
    vi.mocked(api.updateItPriority).mockRejectedValue(new api.ApiError("This ticket changed.", 409, "STALE_VERSION"));
    renderPage();
    const priority = await screen.findByLabelText("IT Priority");
    fireEvent.change(priority, { target: { value: "HIGH" } });
    fireEvent.click(screen.getByRole("button", { name: "Save priority" }));
    expect(await screen.findByRole("button", { name: "Reload ticket and keep selections" })).toBeInTheDocument();
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({ ...ticket, version: 8 });
    fireEvent.click(screen.getByRole("button", { name: "Reload ticket and keep selections" }));
    await waitFor(() => expect(api.fetchStaffTicketDetail).toHaveBeenCalledTimes(2));
    expect(priority).toHaveValue("HIGH");
    vi.mocked(api.updateItPriority).mockResolvedValue({ ...ticket, itPriority: "HIGH", version: 9 });
    fireEvent.click(screen.getByRole("button", { name: "Save priority" }));
    await waitFor(() => expect(api.updateItPriority).toHaveBeenLastCalledWith(ticket.ticketNumber, "HIGH", 8));
  });

  it("allows Administrator workflow controls while keeping comment and note writing hidden", async () => {
    renderPage("ADMINISTRATOR");
    expect(await screen.findByLabelText("Formal status")).toBeInTheDocument();
    expect(screen.getByLabelText("Ticket owner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Public comment")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Internal note")).not.toBeInTheDocument();
  });
});
