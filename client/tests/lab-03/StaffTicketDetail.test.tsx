import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTicketDetailPage from "../../src/pages/StaffTicketDetailPage";
import * as api from "../../src/services/api";

vi.mock("../../src/services/api", async () => ({
  ...(await vi.importActual<typeof api>("../../src/services/api")),
  claimStaffTicket: vi.fn(),
  createInternalNote: vi.fn(),
  createPublicComment: vi.fn(),
  fetchStaffOwners: vi.fn(),
  fetchStaffTicketDetail: vi.fn(),
  updateFormalStatus: vi.fn(),
  updateItPriority: vi.fn(),
  updateTicketOwner: vi.fn(),
}));

const baseTicket: api.StaffTicketDetail = {
  id: 7,
  ticketNumber: "TKT-2026-000007",
  requesterId: 2,
  categoryId: 3,
  relatedSystemId: 4,
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "NEW",
  summary: "Cannot connect to VPN",
  description: "Connection drops immediately.",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-02T09:00:00.000Z",
  requesterResolvedAt: null,
  requester: { id: 2, name: "Requester One", email: "requester@example.test" },
  ticketOwner: null,
  category: { id: 3, name: "Network" },
  relatedSystem: { id: 4, name: "VPN" },
  attachments: [],
  publicComments: [],
  internalNotes: [],
};

const owners: api.StaffOwner[] = [
  { id: 11, name: "Nina Patel", email: "nina@example.test" },
  { id: 12, name: "Owen Garcia", email: "owen@example.test" },
];

function renderPage() {
  return render(<MemoryRouter initialEntries={["/staff/tickets/TKT-2026-000007"]}><Routes><Route path="/staff/tickets/:ticketNumber" element={<StaffTicketDetailPage />} /></Routes></MemoryRouter>);
}

describe("Lab 3 Staff Ticket Detail UI", () => {
  beforeEach(() => {
    vi.mocked(api.fetchStaffTicketDetail).mockReset();
    vi.mocked(api.fetchStaffOwners).mockReset();
    vi.mocked(api.claimStaffTicket).mockReset();
    vi.mocked(api.updateTicketOwner).mockReset();
    vi.mocked(api.updateItPriority).mockReset();
    vi.mocked(api.updateFormalStatus).mockReset();
    vi.mocked(api.createPublicComment).mockReset();
    vi.mocked(api.createInternalNote).mockReset();
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue(baseTicket);
    vi.mocked(api.fetchStaffOwners).mockResolvedValue(owners);
  });

  it("shows read-only ticket data, permitted transitions, and the Claim action", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Cannot connect to VPN" })).toBeInTheDocument());

    expect(screen.getByText("Requester One")).toBeInTheDocument();
    expect(screen.getByText("Internal — visible to IT Staff and Administrators only")).toBeInTheDocument();
    const statusSelect = screen.getByLabelText("Formal status");
    expect(within(statusSelect).getByRole("option", { name: /OPEN/ })).toBeInTheDocument();
    expect(within(statusSelect).getByRole("option", { name: /CANCELLED/ })).toBeInTheDocument();
    expect(within(statusSelect).queryByRole("option", { name: /RESOLVED/ })).not.toBeInTheDocument();

    vi.mocked(api.claimStaffTicket).mockResolvedValue({ ...baseTicket, ticketOwner: owners[0] });
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(() => expect(api.claimStaffTicket).toHaveBeenCalledWith(baseTicket.ticketNumber));
    expect(await screen.findByRole("status")).toHaveTextContent("Ticket claimed.");
  });

  it("confirms owner changes and terminal status changes", async () => {
    const inProgressTicket = { ...baseTicket, currentStatus: "IN_PROGRESS" } as api.StaffTicketDetail;
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue(inProgressTicket);
    vi.mocked(api.updateTicketOwner).mockResolvedValue({ ...inProgressTicket, ticketOwner: owners[1] });
    vi.mocked(api.updateFormalStatus).mockResolvedValue({ ...inProgressTicket, currentStatus: "RESOLVED" });
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Ticket owner")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Ticket owner"), { target: { value: String(owners[1].id) } });
    expect(screen.getByRole("dialog")).toHaveTextContent("Set TKT-2026-000007 owner to Owen Garcia?");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.updateTicketOwner).toHaveBeenCalledWith(baseTicket.ticketNumber, owners[1].id));

    fireEvent.change(screen.getByLabelText("Formal status"), { target: { value: "RESOLVED" } });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Change TKT-2026-000007 to RESOLVED?");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.updateFormalStatus).toHaveBeenCalledWith(baseTicket.ticketNumber, "RESOLVED", true));
  });

  it("posts public comments and internal notes without mixing their timelines", async () => {
    vi.mocked(api.createPublicComment).mockResolvedValue({ id: 1, ticketId: 7, authorId: 11, content: "Public update", createdAt: "2026-09-02T10:00:00.000Z", author: { id: 11, name: "Nina Patel", role: "IT_STAFF" } });
    vi.mocked(api.createInternalNote).mockResolvedValue({ id: 2, ticketId: 7, authorId: 11, content: "Private diagnosis", createdAt: "2026-09-02T10:01:00.000Z", author: { id: 11, name: "Nina Patel", role: "IT_STAFF" } });
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Public comment")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Public comment"), { target: { value: "Public update" } });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
    await waitFor(() => expect(api.createPublicComment).toHaveBeenCalledWith(baseTicket.ticketNumber, "Public update"));
    expect(screen.getByText("Public update")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Internal note"), { target: { value: "Private diagnosis" } });
    fireEvent.click(screen.getByRole("button", { name: "Post internal note" }));
    await waitFor(() => expect(api.createInternalNote).toHaveBeenCalledWith(baseTicket.ticketNumber, "Private diagnosis"));
    expect(screen.getByText("Private diagnosis")).toBeInTheDocument();
  });
});
