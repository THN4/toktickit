import { expect, test } from "@playwright/test";

const admin = { id: 71, name: "Morgan Chen", email: "morgan.chen@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false };
const requester = { id: 72, name: "Ina Patel", email: "ina.patel@example.test", role: "REQUESTER", isActive: true, mustChangePassword: true };

test("E2E-04: Administrator lists, filters, and creates a user with an initial password", async ({ page }) => {
  const createRequests: unknown[] = [];
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { user: admin } }) }));
  await page.route("**/api/admin/users**", async (route) => {
    if (route.request().method() === "POST") { createRequests.push(route.request().postDataJSON()); return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: { user: requester } }) }); }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { users: [admin, requester] } }) });
  });
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByText("Ina Patel").first()).toBeVisible();
  await page.getByLabel("Role filter").selectOption("REQUESTER");
  await expect(page.getByTestId("user-table").getByText("Requester")).toBeVisible();
  await page.getByRole("button", { name: "+ Create User" }).click();
  await page.getByLabel("User name").fill("Created User");
  await page.getByLabel("User email").fill("created@example.test");
  await page.getByLabel("Initial password").fill("InitialPassword!123");
  await page.getByRole("button", { name: "Create User", exact: true }).click();
  await expect.poll(() => createRequests.length).toBe(1);
  await expect(page.getByRole("status")).toContainText("next login requires a password change");
});
