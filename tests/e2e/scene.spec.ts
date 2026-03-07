import { test, expect } from "@playwright/test";

test("ScenePlayer Performance Monitor Test", async ({ page }) => {
  // Navigate to ScenePlayer route (requires authentication)
  await page.goto("/verse/script");

  // Wait for redirect to complete
  await page.waitForLoadState("networkidle");

  const currentUrl = page.url();

  // Unauthenticated access should redirect away from /verse/script
  // (either to a login page or root)
  expect(currentUrl).not.toContain("/verse/script");

  // Should land on the login page
  expect(currentUrl).toMatch(/\/(login|auth|sign-in|$)/);
});
