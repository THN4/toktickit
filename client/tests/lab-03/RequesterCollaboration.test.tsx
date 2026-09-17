import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetailPage from "../../src/pages/TicketDetailPage";
import * as api from "../../src/services/api";

vi.mock("../../src/services/api", async () => ({
  ...(await vi.importActual<typeof api>("../../src/services/api")),
  createPublicComment: vi.fn(),
  fetchPublicComments: vi.fn(),
  fetchTicketDetail: vi.fn(),
  recordRequesterResolution: vi.fn(),
}));

const ticket: api.TicketDetail = {
  id: 4,
  ticketNumber: "TKT-2026-000004",
  requesterId: 2,
  categoryId: 1,
  relatedSystemId: 1,
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "OPEN",
  summary: "Email is unavailable",
  description: "The mailbox cannot receive messages.",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T09:00:00.000Z",
  requesterResolvedAt: null,
  attachments: [],
};

function renderPage() {
  return render(<MemoryRouter initialEntries={["/tickets/TKT-2026-000004"]}><Routes><Route path="/tickets/:ticketNumber" element={<TicketDetailPage />} /></Routes></MemoryRouter>);
}

describe("Lab 3 Requester collaboration UI", () => {
  beforeEach(() => {
    vi.mocked(api.fetchTicketDetail).mockReset();
    vi.mocked(api.fetchPublicComments).mockReset();
    vi.mocked(api.createPublicComment).mockReset();
    vi.mocked(api.recordRequesterResolution).mockReset();
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(ticket);
    vi.mocked(api.fetchPublicComments).mockResolvedValue([]);
  });

  it("posts a public comment and never renders Internal Notes", async () => {
    vi.mocked(api.createPublicComment).mockResolvedValue({ id: 2, ticketId: 4, authorId: 2, content: "Please check again", createdAt: "2026-09-01T10:00:00.000Z", author: { id: 2, name: "Requester", role: "REQUESTER" } });
    renderPage();
    await waitFor(() => expect(screen.getByLabelText("Public comment")).toBeInTheDocument());

    expect(screen.queryByText("Internal Notes")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Public comment"), { target: { value: "Please check again" } });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));
    await waitFor(() => expect(api.createPublicComment).toHaveBeenCalledWith(ticket.ticketNumber, "Please check again"));
    expect(screen.getByText("Please check again")).toBeInTheDocument();
  });

  it("confirms requester resolution without exposing a formal status control", async () => {
    vi.mocked(api.recordRequesterResolution).mockResolvedValue({ ticketNumber: ticket.ticketNumber, currentStatus: "OPEN", requesterResolvedAt: "2026-09-01T11:00:00.000Z" });
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Problem appears resolved" })).toBeInTheDocument());

    expect(screen.queryByLabelText("Formal status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Problem appears resolved" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("will not change the formal status");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.recordRequesterResolution).toHaveBeenCalledWith(ticket.ticketNumber));
    expect(screen.getByText(/formal ticket status remains OPEN/i)).toBeInTheDocument();
  });
});
