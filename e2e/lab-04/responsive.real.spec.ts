import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { loginSeededUser, users } from "../lab-03/real.helpers";

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

async function capture(page: import("@playwright/test").Page, folder: string, screen: string) {
  const directory = `artifacts/lab-04/screenshots/${folder}`;
  fs.mkdirSync(directory, { recursive: true });
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(150);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 8)
        .map((element) => ({ tag: element.tagName, className: element.className, text: element.innerText?.slice(0, 70), right: Math.round(element.getBoundingClientRect().right) })),
    }));
    expect(dimensions.document, JSON.stringify(dimensions.offenders)).toBeLessThanOrEqual(dimensions.viewport);
    await page.screenshot({ path: `${directory}/${screen}-${viewport.name}.png`, fullPage: true });
  }
}

test("RESP-01: real requester dashboard and Actions Taken fit desktop, tablet and mobile", async ({ page }) => {
  await loginSeededUser(page, users.requester, "RequesterE2E!2026");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "My Dashboard" })).toBeVisible();
  await capture(page, "requester-dashboard", "requester-dashboard");

  await page.goto("/tickets/TKT-L3-000005");
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  await capture(page, "actions-taken", "requester-actions-taken");
});

test("RESP-01: real staff dashboard and Actions Taken fit desktop, tablet and mobile", async ({ page }) => {
  await loginSeededUser(page, users.staff, "StaffE2E!2026");
  await page.goto("/staff/dashboard");
  await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  await capture(page, "staff-dashboard", "staff-dashboard");

  await page.goto("/staff/tickets/TKT-L3-000002");
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  await capture(page, "actions-taken", "staff-actions-taken");
});
