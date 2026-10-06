import { expect, test } from "@playwright/test";
import { loginSeededUser, users } from "../lab-03/real.helpers";

test("E2E-03: real dashboards show owned/operational data and enforce role routes", async ({ page }) => {
  await loginSeededUser(page, users.requester, "RequesterE2E!2026");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "My Dashboard" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Requester metrics" })).toContainText("Open Tickets");
  expect(await page.getByRole("link", { name: /^TKT-/ }).count()).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: /TKT-L3-000002/ })).toHaveCount(0);

  await page.goto("/staff/dashboard");
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await loginSeededUser(page, users.staff, "StaffE2E!2026");
  await page.goto("/staff/dashboard");
  await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tickets by Status" })).toContainText("IN PROGRESS");
  await expect(page.getByRole("region", { name: "Tickets by IT priority" })).toContainText("HIGH IT Priority");
  await expect(page.getByRole("link", { name: /TKT-L3-000002/ }).first()).toHaveAttribute("href", /\/staff\/tickets\//);

  await page.getByRole("button", { name: "Log out" }).click();
  await loginSeededUser(page, users.administrator, "AdminE2E!2026");
  await page.goto("/staff/dashboard");
  await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
});
