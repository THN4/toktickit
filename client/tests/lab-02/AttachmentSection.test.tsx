import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TicketDetailPage from "../../src/pages/TicketDetailPage";
import * as api from "../../src/services/api";

describe("UI-02, UI-03, UI-12, UI-13: Attachment Section Tests", () => {
  const baseTicketDetail: api.TicketDetail = {
    id: 1,
    ticketNumber: "TKT-2026-000001",
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "OPEN",
    summary: "Printer troubleshooting",
    description: "Printer keeps jamming on tray 2.",
    createdAt: "2026-06-15T09:30:00.000Z",
    updatedAt: "2026-06-15T10:00:00.000Z",
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

  // ─── UI-02: File Size > 5 MB (AC-06, BR-17) ───────────────────────────────
  it("UI-02: shows error when selecting file larger than 5 MB", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(baseTicketDetail);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Printer troubleshooting")).toBeInTheDocument();
    });

    const fileInput = container.querySelector("#attachment-input") as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // Mock file larger than 5 MB
    const largeFile = new File(["a".repeat(100)], "huge_log.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File size exceeds 5 MB limit/i)).toBeInTheDocument();
    });
  });

  // ─── UI-03: Unsupported File Type (AC-07, BR-16) ───────────────────────────
  it("UI-03: shows error when selecting unsupported file type", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(baseTicketDetail);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Printer troubleshooting")).toBeInTheDocument();
    });

    const fileInput = container.querySelector("#attachment-input") as HTMLInputElement;

    const invalidFile = new File(["malicious"], "virus.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Unsupported file type. Only JPG, PNG, WEBP, and PDF files are allowed/i)
      ).toBeInTheDocument();
    });
  });

  // ─── UI-12: Download Button Absent for Removed Attachment (BR-20) ──────────
  it("UI-12: removed attachment displays 'Removed' badge and reason, but NO download button", async () => {
    const ticketWithRemovedAttachment: api.TicketDetail = {
      ...baseTicketDetail,
      attachments: [
        {
          id: 101,
          ticketId: 1,
          uploaderId: 1,
          originalFilename: "sensitive_passwords.png",
          storedFilename: "attachment-101.png",
          mimeType: "image/png",
          sizeBytes: 15000,
          storagePath: "uploads/attachment-101.png",
          removedAt: "2026-06-16T12:00:00.000Z",
          removedByRequesterId: 1,
          removalReason: "Uploaded secret credentials by mistake.",
          createdAt: "2026-06-15T10:00:00.000Z",
          uploader: { id: 1, name: "Jennifer Anderson" },
          removedBy: { id: 1, name: "Jennifer Anderson" },
        },
      ],
    };

    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(ticketWithRemovedAttachment);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("sensitive_passwords.png")).toBeInTheDocument();
      expect(screen.getByText("Removed")).toBeInTheDocument();
      expect(screen.getByText("Uploaded secret credentials by mistake.")).toBeInTheDocument();
    });

    // Verify Download button / link is completely absent for this removed attachment
    expect(screen.queryByRole("link", { name: /Download/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Download Unavailable/i)).toBeInTheDocument();
  });

  // ─── UI-13: Add Attachment Disabled at Limit (BR-18) ───────────────────────
  it("UI-13: disables Add Attachment button when ticket has reached 5 active attachments limit", async () => {
    const fiveAttachments: api.Attachment[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      ticketId: 1,
      uploaderId: 1,
      originalFilename: `screenshot_${i + 1}.png`,
      storedFilename: `attachment-${i + 1}.png`,
      mimeType: "image/png",
      sizeBytes: 10000,
      storagePath: `uploads/attachment-${i + 1}.png`,
      removedAt: null,
      removedByRequesterId: null,
      removalReason: null,
      createdAt: "2026-06-15T10:00:00.000Z",
      uploader: { id: 1, name: "Jennifer Anderson" },
    }));

    const ticketAtLimit: api.TicketDetail = {
      ...baseTicketDetail,
      attachments: fiveAttachments,
    };

    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(ticketAtLimit);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Attachments (5/5)")).toBeInTheDocument();
    });

    // File input must be disabled
    const fileInput = container.querySelector("#attachment-input") as HTMLInputElement;
    expect(fileInput).toBeDisabled();

    // Button label has disabled styles / tooltip
    const buttonLabel = screen.getByText("+ Add Attachment");
    expect(buttonLabel).toHaveClass("cursor-not-allowed");
  });
});

