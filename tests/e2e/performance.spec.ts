import { test, expect } from "@playwright/test";

test("Homepage Performance Metrics", async ({ page }) => {
  const startTime = Date.now();
  await page.goto("/");
  const loadTime = Date.now() - startTime; // Rough estimate including network overhead

  // Wait for main content to identify LCP candidate roughly
  // await page.waitForSelector('#app');

  // Get Performance API metrics
  const performanceTiming = await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((entry) => entry.name === "first-contentful-paint");

    return {
      loadEventEnd: navigation?.loadEventEnd,
      domContentLoadedEventEnd: navigation?.domContentLoadedEventEnd,
      fcp: fcp?.startTime,
    };
  });

  console.log("--- Performance Metrics ---");
  console.log(`Rough Page Load: ${loadTime}ms`);
  console.log(
    `DOM Content Loaded: ${performanceTiming.domContentLoadedEventEnd}ms`
  );
  console.log(`Load Event End: ${performanceTiming.loadEventEnd}ms`);
  console.log(`First Contentful Paint (FCP): ${performanceTiming.fcp}ms`);
  console.log("---------------------------");

  // Basic assertion to ensure page actually loaded
  expect(performanceTiming.loadEventEnd).toBeGreaterThan(0);
});
