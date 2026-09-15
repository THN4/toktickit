import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import MyTicketsPage from "../../src/pages/MyTicketsPage";
import * as api from "../../src/services/api";

describe("UI-08, UI-09, UI-10: MyTickets Component Tests", () => {
  const mockCategories = [
    { id: 1, name: "Hardware" },
    { id: 2, name: "Software" },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
  });

  function renderComponent() {
    return render(
      <BrowserRouter>
        <MyTicketsPage />
      </BrowserRouter>
    );
  }

  // ─── UI-08: Empty State (AC-14) ────────────────────────────────────────────
  it("UI-08: displays empty state when requester has no tickets and no filters are active", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      tickets: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("No tickets submitted yet")).toBeInTheDocument();
      expect(screen.getByText(/You haven't submitted any support requests/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Create Your First Ticket/i })).toBeInTheDocument();
    });
  });

  // ─── UI-09: No-Results State (AC-15) ───────────────────────────────────────
  it("UI-09: displays no-results state when filters match zero tickets", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      tickets: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
      },
    });

    renderComponent();

    // พิมพ์ค้นหาข้อความเพื่อเปิดใช้งาน filter
    const searchInput = screen.getByPlaceholderText(/Search by summary or ticket #.../i);
    fireEvent.change(searchInput, { target: { value: "nonexistentKeyword12345" } });

    await waitFor(() => {
      expect(screen.getByText("No tickets match your filters")).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your search keyword/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Clear Filters/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── UI-10: Clear Filters Button Visibility ────────────────────────────────
  it("UI-10: Clear Filters button appears only when filters are active, and clears them when clicked", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      tickets: [
        {
          id: 1,
          ticketNumber: "TKT-2026-000001",
          requesterId: 1,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          currentStatus: "NEW",
          summary: "Printer broken",
          description: "Cannot print PDF documents.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: { id: 1, name: "Hardware" },
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      },
    });

    renderComponent();

    // รอให้โหลดข้อมูลตั๋วขึ้นมาแสดงบนหน้าจอ
    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThanOrEqual(1);
    });

    // ในตอนแรกยังไม่มี filter ปุ่ม Clear Filters จะต้องไม่ปรากฏ
    expect(screen.queryByRole("button", { name: /Clear Filters/i })).not.toBeInTheDocument();

    // เลือก Category เพื่อให้ filter ทำงาน
    const categorySelect = screen.getByRole("combobox", { name: "Category" });
    fireEvent.change(categorySelect, { target: { value: "Hardware" } });

    // ปุ่ม Clear Filters จะต้องปรากฏขึ้นมา
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Clear Filters/i })).toBeInTheDocument();
    });

    // เมื่อกดปุ่ม Clear Filters
    fireEvent.click(screen.getByRole("button", { name: /Clear Filters/i }));

    // ปุ่ม Clear Filters จะต้องหายไป
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Clear Filters/i })).not.toBeInTheDocument();
    });
  });
});

