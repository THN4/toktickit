import { expect, test } from "@playwright/test";
import { completeRequiredPasswordChange, login, users } from "./real.helpers";

test("E2E-03: real Administrator session creates an account with an initial password", async ({ page }) => {
  const email = `e2e-admin-${Date.now()}@example.test`;
  await login(page, users.administrator);
  await completeRequiredPasswordChange(page, "AdminE2E!2026");
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.getByRole("button", { name: "+ Create User" }).click();
  await page.getByLabel("User name").fill("E2E Created Requester");
  await page.getByLabel("User email").fill(email);
  await page.getByLabel("User role").selectOption("REQUESTER");
  await page.getByLabel("Initial password").fill("CreatedE2E!2026");
  await page.getByRole("button", { name: "Create User", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("next login requires a password change");
  await expect(page.getByTestId("user-table").getByText(email)).toBeVisible();
});
