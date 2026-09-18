import { expect, test } from "@playwright/test";

const initialUser = { id: 91, name: "Morgan Chen", email: "morgan.chen@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: true };
const updatedUser = { ...initialUser, mustChangePassword: false };

test.describe("Lab 3 authentication flow", () => {
  test.beforeEach(async ({ page }) => {
    let sessionUser: typeof initialUser | null = null;
    await page.route("**/api/auth/**", async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const reply = (status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname.endsWith("/me")) return sessionUser ? reply(200, { success: true, data: { user: sessionUser } }) : reply(401, { success: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
      if (url.pathname.endsWith("/login") && method === "POST") {
        const { email, password } = route.request().postDataJSON();
        if (email === initialUser.email && password === "InitialPassword!123") { sessionUser = initialUser; return reply(200, { success: true, data: { user: sessionUser } }); }
        return reply(401, { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } });
      }
      if (url.pathname.endsWith("/change-password") && method === "POST") { sessionUser = updatedUser; return reply(200, { success: true, data: { user: updatedUser } }); }
      if (url.pathname.endsWith("/logout") && method === "POST") { sessionUser = null; return reply(200, { success: true, data: { loggedOut: true } }); }
      return route.fallback();
    });
    await page.route("**/api/admin/users**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { users: [] } }) }));
  });

  test("E2E-01: invalid credentials receive safe feedback", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(initialUser.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText("Unable to sign in with those credentials");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("E2E-02: initial password routes through change password, then logout blocks protected access", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(initialUser.email);
    await page.getByLabel("Password").fill("InitialPassword!123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/change-password$/);
    await page.getByLabel("Current password").fill("InitialPassword!123");
    await page.getByRole("textbox", { name: "New password *", exact: true }).fill("ReplacementPassword!123");
    await page.getByRole("textbox", { name: "Confirm new password *", exact: true }).fill("ReplacementPassword!123");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login$/);
  });
});
