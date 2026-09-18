import { expect, test } from "@playwright/test";
import { completeRequiredPasswordChange, login, users } from "./real.helpers";

test("E2E-01: real authentication creates a session, requires password change, and blocks access after logout", async ({ page }) => {
  await login(page, users.requester, "wrong-password");
  await expect(page.getByRole("alert")).toContainText("Unable to sign in with those credentials");

  await login(page, users.requester);
  await completeRequiredPasswordChange(page, "RequesterE2E!2026");
  await expect(page).toHaveURL(/\/my-tickets$/);
  await expect(page.getByText("Jennifer Anderson")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/my-tickets");
  await expect(page).toHaveURL(/\/login$/);
});
