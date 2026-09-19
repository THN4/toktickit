import { expect, test } from "@playwright/test";
import { completeRequiredPasswordChange, login, users } from "./real.helpers";

test("E2E-02: real IT Staff session searches the seeded queue and opens Ticket Detail", async ({ page }) => {
  await login(page, users.staff);
  await completeRequiredPasswordChange(page, "StaffE2E!2026");
  await expect(page).toHaveURL(/\/staff\/tickets$/);
  await expect(page.getByRole("heading", { name: "My Queue" })).toBeVisible();
  await page.getByLabel("Search").fill("battery");
  await expect(page.getByText("TKT-L3-000003").first()).toBeVisible();
  await page.getByRole("link", { name: "TKT-L3-000003" }).first().click();
  await expect(page).toHaveURL(/\/staff\/tickets\/TKT-L3-000003$/);
  await expect(page.getByRole("heading", { name: "Laptop battery drains while sleeping" })).toBeVisible();
});
