import { expect, type Page } from "@playwright/test";
import fs from "node:fs";

function localInitialPassword() {
  const environment = fs.readFileSync("server/.env", "utf8");
  const match = environment.match(/^LAB3_INITIAL_PASSWORD="?([^"\r\n]+)"?/m);
  if (!match) throw new Error("LAB3_INITIAL_PASSWORD is required in server/.env for real E2E.");
  return match[1];
}

export const initialPassword = localInitialPassword();
export const users = {
  requester: "jennifer.anderson@example.com",
  staff: "nina.patel@example.com",
  administrator: "morgan.chen@example.com",
} as const;

export async function login(page: Page, email: string, password = initialPassword) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function completeRequiredPasswordChange(page: Page, password: string) {
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel("Current password").fill(initialPassword);
  await page.getByRole("textbox", { name: "New password *", exact: true }).fill(password);
  await page.getByRole("textbox", { name: "Confirm new password *", exact: true }).fill(password);
  await page.getByRole("button", { name: "Save new password" }).click();
  await page.waitForURL(/\/(dashboard|staff\/dashboard)$/);
}

/** Log in reliably when another real E2E has already changed the seeded password. */
export async function loginSeededUser(page: Page, email: string, changedPassword: string) {
  await login(page, email);
  await Promise.race([
    page.waitForURL(/\/change-password$/),
    page.getByRole("alert").waitFor(),
    page.waitForURL(/\/(dashboard|staff\/dashboard|admin\/users|staff\/tickets|my-tickets)$/),
  ]);

  if (new URL(page.url()).pathname === "/change-password") {
    await completeRequiredPasswordChange(page, changedPassword);
    return;
  }

  if (await page.getByRole("alert").isVisible().catch(() => false)) {
    await login(page, email, changedPassword);
    await expect(page).not.toHaveURL(/\/login$/);
  }
}
