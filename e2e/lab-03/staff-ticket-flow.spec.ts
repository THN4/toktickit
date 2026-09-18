import { expect, test } from "@playwright/test";

const staffUser = { id: 31, name: "Nina Patel", email: "nina.patel@example.test", role: "IT_STAFF", isActive: true, mustChangePassword: false };
const ticket = { id: 301, ticketNumber: "TKT-L3-000003", requesterId: 11, categoryId: 1, relatedSystemId: 1, summary: "Laptop battery drains while sleeping", description: "Battery is empty after sleep mode.", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-02T08:00:00.000Z", requester: { id: 11, name: "Sarah Johnson", email: "sarah@example.test" }, ticketOwner: { id: 31, name: "Nina Patel", email: "nina.patel@example.test" } };

test("E2E-03: IT Staff queue renders filters, safe ticket data, and debounced search", async ({ page }) => {
  const queueRequests: URL[] = [];
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { user: staffUser } }) }));
  await page.route("**/api/staff/tickets**", async (route) => {
    const url = new URL(route.request().url()); queueRequests.push(url);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { items: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } } }) });
  });
  await page.goto("/staff/tickets");
  await expect(page.getByRole("heading", { name: "My Queue" })).toBeVisible();
  await expect(page.getByText(ticket.ticketNumber).first()).toBeVisible();
  await expect(page.getByText("Nina Patel").first()).toBeVisible();
  await page.getByLabel("Search").fill("battery");
  await expect.poll(() => queueRequests.at(-1)?.searchParams.get("search")).toBe("battery");
  await page.getByLabel("Status").selectOption("IN_PROGRESS");
  await expect.poll(() => queueRequests.at(-1)?.searchParams.get("status")).toBe("IN_PROGRESS");
});
