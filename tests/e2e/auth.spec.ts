import { test, expect } from "@playwright/test";

test.describe("Auth and login page basic checks", () => {
  test("/site/login is redirected to /web/index", async ({ page }) => {
    await page.goto("/site/login");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/web\/index$/);
  });

  test("/login is redirected to /web/index", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/web\/index$/);
  });

  test("/web/index loads nav and login entry", async ({ page }) => {
    await page.goto("/web/index");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".nav-container")).toBeVisible();
    await expect(
      page.locator(".nav-right .login-button").first()
    ).toBeVisible();
  });

  test("Click login button opens login dialog with required form fields", async ({
    page,
  }) => {
    await page.goto("/web/index");
    await page.waitForLoadState("networkidle");

    await page.locator(".nav-right .login-button").first().click();

    await expect(page.locator(".login-container")).toBeVisible();
    await expect(page.locator(".name-password-form .login-form")).toBeVisible();
    await expect(
      page.locator(".name-password-form .login-form .el-input input").first()
    ).toBeVisible();
    await expect(
      page.locator(".name-password-form input[type='password']")
    ).toBeVisible();
    await expect(
      page.locator(".name-password-form .login-button").first()
    ).toBeVisible();
  });

  test("Forgot password dialog can be opened from login form", async ({
    page,
  }) => {
    await page.goto("/web/index");
    await page.waitForLoadState("networkidle");

    await page.locator(".nav-right .login-button").first().click();
    await expect(
      page.locator(".name-password-form .forgot-password")
    ).toBeVisible();

    await page.locator(".name-password-form .forgot-password").click();

    await expect(page.locator("input[type='email']")).toBeVisible();
  });
});
