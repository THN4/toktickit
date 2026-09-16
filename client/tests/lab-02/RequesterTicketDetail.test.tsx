import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TicketDetailPage from "../../src/pages/TicketDetailPage";
import * as api from "../../src/services/api";

describe("UI-11: TicketDetail Component Tests (AC-16)", () => {
  const mockTicketDetail: api.TicketDetail = {
    id: 1,
    ticketNumber: "TKT-2026-000001",
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "IN_PROGRESS",
    summary: "Cannot access internal VPN",
    description: "Whenever I connect to the corporate VPN from home, it immediately disconnects.",
    createdAt: "2026-06-15T09:30:00.000Z",
    updatedAt: "2026-06-15T10:00:00.000Z",
    requester: { id: 1, name: "Jennifer Anderson", email: "jennifer@example.com" },
    ticketOwner: { id: 2, name: "Bob Support", email: "bob@support.com" },
    category: { id: 1, name: "Network" },
    relatedSystem: { id: 1, name: "VPN" },
    attachments: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function renderComponent() {
    return render(
      <MemoryRouter initialEntries={["/tickets/TKT-2026-000001"]}>
        <Routes>
          <Route path="/tickets/:ticketNumber" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("UI-11: all header and metadata fields render as read-only with no editable inputs", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValueOnce(mockTicketDetail);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
      expect(screen.getByText("Cannot access internal VPN")).toBeInTheDocument();
    });

    // Verify metadata text is displayed
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("Bob Support")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("VPN")).toBeInTheDocument();
    expect(screen.getAllByText("HIGH").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("IN PROGRESS")).toBeInTheDocument();

    // Verify there are NO editable input fields in the metadata/header card
    const inputs = screen.queryAllByRole("textbox");
    // Only removalReason textarea inside the closed modal exists in DOM or none
    expect(inputs.length).toBe(0);
  });
});

