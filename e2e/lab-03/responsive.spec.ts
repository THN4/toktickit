import { expect, test } from "@playwright/test";

const admin = { id: 71, name: "Morgan Chen", email: "morgan.chen@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false };
const users = [admin, { id: 72, name: "Ina Patel", email: "a-very-long-address-that-must-wrap-on-a-small-screen@example.test", role: "REQUESTER", isActive: false, mustChangePassword: true }];

test("VIS-01: User Management has no overflow at desktop, tablet, or mobile", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { user: admin } }) }));
  await page.route("**/api/admin/users**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { users } }) }));
  for (const viewport of [{ name: "desktop", width: 1280, height: 720 }, { name: "tablet", width: 768, height: 1024 }, { name: "mobile", width: 375, height: 667 }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/admin/users");
    const list = viewport.name === "mobile" ? page.getByTestId("user-card-list") : page.getByTestId("user-table");
    await expect(list.getByText("a-very-long-address-that-must-wrap-on-a-small-screen@example.test")).toBeVisible();
    if (viewport.name === "mobile") await expect(page.getByTestId("user-card-list")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: `artifacts/lab-03/screenshots/user-management/${viewport.name}.png`, fullPage: true });
  }
});
