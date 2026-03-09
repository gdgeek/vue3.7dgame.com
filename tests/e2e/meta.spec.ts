import { test, expect } from "@playwright/test";

test.describe("Meta route auth guard", () => {
  test("Unauthenticated user visiting /meta is redirected", async ({
    page,
  }) => {
    await page.goto("/meta");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/web\/index\?redirect=%2Fmeta$/);
  });

  test("Unauthenticated user visiting /meta/list is redirected", async ({
    page,
  }) => {
    await page.goto("/meta/list");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/web\/index\?redirect=%2Fmeta%2Flist$/);
  });

  test("Unauthenticated user visiting /meta/prefabs is redirected", async ({
    page,
  }) => {
    await page.goto("/meta/prefabs");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/web\/index\?redirect=%2Fmeta%2Fprefabs$/);
  });

  test("Meta route redirect preserves query params", async ({ page }) => {
    await page.goto("/meta/scene?id=1&title=test-scene");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(
      /\/web\/index\?redirect=%2Fmeta%2Fscene%3Fid%3D1%26title%3Dtest-scene$/
    );
  });

  test("Meta script route redirect preserves query params", async ({
    page,
  }) => {
    await page.goto("/meta/script?lang=lua");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(
      /\/web\/index\?redirect=%2Fmeta%2Fscript%3Flang%3Dlua$/
    );
  });
});
