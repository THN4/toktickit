import { expect, test } from "@playwright/test";
import { loginSeededUser, users } from "../lab-03/real.helpers";

let ticketNumber = "";

async function createRequesterTicket(page: import("@playwright/test").Page) {
  await loginSeededUser(page, users.requester, "RequesterE2E!2026");
  await page.goto("/create-ticket");
  await page.locator("select").nth(0).selectOption({ label: "Software" });
  await page.locator("select").nth(1).selectOption({ label: "LEB2 App" });
  await page.getByLabel(/Summary/).fill(`Issue 53 E2E ${Date.now()}`);
  await page.getByLabel(/Description/).fill("A real requester ticket used for Lab 4 end-to-end verification.");
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  const created = page.getByText(/TKT-\d{4}-\d{6}/);
  await expect(created).toBeVisible();
  ticketNumber = (await created.textContent())!.trim();
  await page.getByRole("button", { name: "Log out" }).click();
}

test("E2E-01/02: real browser runs Action Taken lifecycle and resolution gate against PostgreSQL", async ({ page }) => {
  await createRequesterTicket(page);
  await loginSeededUser(page, users.staff, "StaffE2E!2026");
  await page.goto(`/staff/tickets/${ticketNumber}`);
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();

  await page.getByRole("button", { name: "Add Action Taken" }).click();
  await page.getByLabel("Action description").fill("Issue 53 real browser workflow");
  await page.getByLabel("Assignee").selectOption({ label: "Nina Patel" });
  await page.getByLabel("Follow-up required").check();
  await page.getByLabel("Follow-up note").fill("Confirm production logs after the fix.");
  await page.getByRole("button", { name: "Save action" }).click();

  const action = page.locator("li").filter({ hasText: "Issue 53 real browser workflow" });
  await expect(action).toContainText("PLANNED");
  await expect(action).toContainText("Nina Patel");
  await action.getByRole("button", { name: "Start" }).click();
  await expect(action).toContainText("IN PROGRESS");

  await action.getByRole("button", { name: "Complete" }).click();
  const dialog = page.getByRole("dialog", { name: "Complete Action Taken" });
  await expect(dialog).toBeVisible();
  await page.getByLabel("Completion result").fill("Log review completed in the real database flow.");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Completion action date and time")).toBeFocused();
  await expect(dialog).toContainText("Complete Action Taken");
  await page.getByRole("button", { name: "Confirm completion" }).click();
  await expect(action).toContainText("COMPLETED");
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeFocused();
  await expect(action).toContainText("Log review completed in the real database flow.");
  await expect(action).toContainText("Nina Patel");
  await expect(action).toContainText("Confirm production logs after the fix.");
  await action.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Follow-up required").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(action).toContainText("Not required");
  await expect(page.getByRole("status")).toContainText("Action Taken updated.");

  await page.goto(`/staff/tickets/${ticketNumber}`);

  await page.getByRole("button", { name: "Add Action Taken" }).click();
  await page.getByLabel("Action description").fill("Issue 53 resolution gate fixture");
  await page.getByRole("button", { name: "Save action" }).click();
  const gateAction = page.locator("li").filter({ hasText: "Issue 53 resolution gate fixture" });
  const status = page.getByLabel("Formal status");
  await status.selectOption("OPEN");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Formal status updated.", { exact: true })).toBeVisible();
  await status.selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Formal status updated.", { exact: true })).toBeVisible();
  await status.selectOption("RESOLVED");
  await page.getByRole("button", { name: "Update status" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/planned|in.progress|follow-up/i);

  await gateAction.getByRole("button", { name: "Start" }).click();
  await gateAction.getByRole("button", { name: "Complete" }).click();
  await page.getByLabel("Completion result").fill("Completed to satisfy the resolution gate.");
  await page.getByRole("button", { name: "Confirm completion" }).click();
  await expect(gateAction).toContainText("COMPLETED");

  await status.selectOption("RESOLVED");
  await page.getByRole("button", { name: "Update status" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Formal status updated.", { exact: true })).toBeVisible();
  await status.selectOption("REOPENED");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(status).toHaveValue("REOPENED");
});
