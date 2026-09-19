import { expect, test } from "@playwright/test";

const admin = { id: 71, name: "Morgan Chen", email: "morgan.chen@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false } as const;
const staff = { id: 31, name: "Nina Patel", email: "nina.patel@example.test", role: "IT_STAFF", isActive: true, mustChangePassword: false } as const;
const passwordChangeAdmin = { ...admin, mustChangePassword: true } as const;
const requester = { id: 72, name: "Ina Patel", email: "ina.patel@example.test", role: "REQUESTER", isActive: false, mustChangePassword: true } as const;
const ticket = {
  id: 301, ticketNumber: "TKT-L3-000003", requesterId: 11, categoryId: 1, relatedSystemId: 1,
  summary: "Laptop battery drains while sleeping", description: "Battery is empty after sleep mode.",
  requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS",
  createdAt: "2026-09-01T08:00:00.000Z", updatedAt: "2026-09-02T08:00:00.000Z",
  requester: { id: 11, name: "Sarah Johnson", email: "sarah@example.test" },
  ticketOwner: { id: 31, name: "Nina Patel", email: "nina.patel@example.test" },
  attachments: [],
  publicComments: [{ id: 1, ticketId: 301, authorId: 11, content: "Please let me know when this is fixed.", createdAt: "2026-09-02T09:00:00.000Z", author: { id: 11, name: "Sarah Johnson", role: "REQUESTER" } }],
  internalNotes: [{ id: 2, ticketId: 301, authorId: 31, content: "Battery health report requested from the user.", createdAt: "2026-09-02T09:10:00.000Z", author: { id: 31, name: "Nina Patel", role: "IT_STAFF" } }],
};

const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify({ success: status < 400, data: body }) });
const noOverflow = async (page: any, width: number) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
};

async function stubSession(page: any, user: typeof admin | typeof staff | typeof passwordChangeAdmin) {
  await page.route("**/api/auth/me", (route: any) => route.fulfill(json({ user })));
}

test("VIS-02: Authentication evidence captures login feedback and required password change", async ({ page }) => {
  let resolveLogin: (() => void) | undefined;
  await page.route("**/api/auth/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false, error: { message: "Sign in required." } }) });
    if (path.endsWith("/login")) {
      const password = route.request().postDataJSON().password;
      if (password === "wait-for-evidence") await new Promise<void>((resolve) => { resolveLogin = resolve; });
      return route.fulfill(password === "InitialPassword!123" || password === "wait-for-evidence"
        ? json({ user: passwordChangeAdmin })
        : { status: 401, contentType: "application/json", body: JSON.stringify({ success: false, error: { message: "Invalid email or password." } }) });
    }
    return route.fulfill(json({ loggedOut: true }));
  });
  await page.goto("/login");
  await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/login.png", fullPage: true });
  for (const viewport of [{ name: "desktop", width: 1280, height: 720 }, { name: "tablet", width: 768, height: 1024 }, { name: "mobile", width: 375, height: 667 }]) {
    await page.setViewportSize(viewport);
    await noOverflow(page, viewport.width);
    await page.screenshot({ path: `artifacts/lab-03/screenshots/authentication/login-${viewport.name}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/login-invalid.png", fullPage: true });
  await page.getByLabel("Password").fill("wait-for-evidence");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Signing in…" })).toBeVisible();
  await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/login-busy.png", fullPage: true });
  resolveLogin?.();
  await expect(page).toHaveURL(/change-password/);
  await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/change-password.png", fullPage: true });
  for (const viewport of [{ name: "desktop", width: 1280, height: 720 }, { name: "tablet", width: 768, height: 1024 }, { name: "mobile", width: 375, height: 667 }]) {
    await page.setViewportSize(viewport);
    await noOverflow(page, viewport.width);
    await page.screenshot({ path: `artifacts/lab-03/screenshots/authentication/change-password-${viewport.name}.png`, fullPage: true });
  }
});

test("VIS-03: Queue evidence captures responsive, no-results, and failure states", async ({ page }) => {
  await stubSession(page, staff);
  await page.route("**/api/staff/tickets**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("search") === "failure") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, error: { message: "Queue is temporarily unavailable." } }) });
    if (params.get("status") === "CLOSED") return route.fulfill(json({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }));
    return route.fulfill(json({ items: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } }));
  });
  for (const viewport of [{ name: "desktop", width: 1280, height: 720 }, { name: "tablet", width: 768, height: 1024 }, { name: "mobile", width: 375, height: 667 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/staff/tickets");
    await expect(page.locator(`a[href="/staff/tickets/${ticket.ticketNumber}"]:visible`).first()).toBeVisible();
    await noOverflow(page, viewport.width);
    await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-queue/${viewport.name}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/staff/tickets");
  await page.getByLabel("Status").selectOption("CLOSED");
  await expect(page.getByText("No Tickets match the current search or filters.")).toBeVisible();
  await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-queue/no-results.png", fullPage: true });
  await page.getByLabel("Search").fill("failure");
  await expect(page.getByRole("alert")).toContainText("Queue is temporarily unavailable.");
  await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-queue/failure.png", fullPage: true });
});

test("VIS-04: Staff ticket detail evidence captures controls, comments, and internal notes", async ({ page }) => {
  await stubSession(page, staff);
  await page.route("**/api/staff/owners", (route) => route.fulfill(json([ticket.ticketOwner])));
  await page.route("**/api/staff/tickets/TKT-L3-000003", (route) => route.fulfill(json(ticket)));
  await page.goto("/staff/tickets/TKT-L3-000003");
  await expect(page.getByRole("heading", { name: ticket.summary })).toBeVisible();
  await noOverflow(page, 1280);
  await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-ticket-detail/detail.png", fullPage: true });
  for (const viewport of [{ name: "desktop", width: 1280, height: 720 }, { name: "tablet", width: 768, height: 1024 }, { name: "mobile", width: 375, height: 667 }]) {
    await page.setViewportSize(viewport);
    await noOverflow(page, viewport.width);
    await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-ticket-detail/detail-${viewport.name}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel("Public comment").fill("Replacement battery arranged for tomorrow.");
  await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-ticket-detail/comments.png", fullPage: true });
  await page.getByLabel("Internal note").fill("Verify the battery serial number before installation.");
  await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-ticket-detail/internal-notes.png", fullPage: true });
});

test("VIS-05: User Management evidence captures validation in addition to responsive views", async ({ page }) => {
  await stubSession(page, admin);
  await page.route("**/api/admin/users**", (route) => route.fulfill(json({ users: [admin, requester] })));
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await page.getByRole("button", { name: "+ Create User" }).click();
  await page.getByRole("button", { name: "Create User", exact: true }).click();
  await expect(page.getByText("Name is required.")).toBeVisible();
  await page.screenshot({ path: "artifacts/lab-03/screenshots/user-management/validation.png", fullPage: true });
});
