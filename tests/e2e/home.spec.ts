import { test, expect } from "@playwright/test";

test.describe("Home route redirects and basic pages", () => {
  test("Unauthenticated user visiting / is redirected to web index with redirect query", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/web\/index\?redirect=%2F$/);
  });

  test("Unauthenticated user visiting /home is redirected to web index", async ({
    page,
  }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/web\/index\?redirect=%2Fhome$/);
  });

  test("Unauthenticated user visiting /home/index is redirected to web index", async ({
    page,
  }) => {
    await page.goto("/home/index");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/web\/index\?redirect=%2Fhome%2Findex$/);
  });

  test("404 page is publicly accessible", async ({ page }) => {
    await page.goto("/404");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/404$/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Unknown route redirects to web index with original path encoded", async ({
    page,
  }) => {
    await page.goto("/this-route-does-not-exist");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(
      /\/web\/index\?redirect=%2Fthis-route-does-not-exist$/
    );
  });
});
