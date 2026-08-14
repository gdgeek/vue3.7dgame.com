#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const DEFAULT_ROUTES = [
  "/resource/voxel/index",
  "/meta/list",
  "/plugins/user-management",
  "/plugins/campus",
  "/plugins/system-admin",
];

function parseArguments(argv) {
  const values = new Map();
  for (const argument of argv) {
    const separator = argument.indexOf("=");
    if (!argument.startsWith("--") || separator < 3) {
      throw new Error(`invalid-argument:${argument.split("=")[0]}`);
    }
    const key = argument.slice(2, separator);
    if (values.has(key)) throw new Error(`duplicate-argument:${key}`);
    values.set(key, argument.slice(separator + 1));
  }

  const allowed = new Set(["base-url", "storage-state", "output", "routes"]);
  for (const key of values.keys()) {
    if (!allowed.has(key)) throw new Error(`unknown-argument:${key}`);
  }

  const baseUrl = values.get("base-url");
  const output = values.get("output");
  if (!baseUrl || !output) throw new Error("base-url-and-output-required");

  const parsedBaseUrl = new URL(baseUrl);
  const isLocalHttp =
    parsedBaseUrl.protocol === "http:" && parsedBaseUrl.hostname === "localhost";
  if (parsedBaseUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error("https-base-url-required");
  }
  if (parsedBaseUrl.username || parsedBaseUrl.password || parsedBaseUrl.search || parsedBaseUrl.hash) {
    throw new Error("base-url-must-not-contain-credentials-query-or-fragment");
  }

  const routes = values.has("routes")
    ? values
        .get("routes")
        .split(",")
        .map((route) => route.trim())
        .filter(Boolean)
    : DEFAULT_ROUTES;
  const hasInvalidRoute = routes.some((route) => {
    if (
      !route.startsWith("/") ||
      route.startsWith("//") ||
      route.includes("?") ||
      route.includes("#")
    ) {
      return true;
    }

    const resolvedRoute = new URL(route, parsedBaseUrl.origin);
    return resolvedRoute.origin !== parsedBaseUrl.origin;
  });
  if (routes.length === 0 || hasInvalidRoute) {
    throw new Error("invalid-routes");
  }

  return {
    baseUrl: parsedBaseUrl.origin,
    output: resolve(output),
    routes,
    storageState: values.get("storage-state")
      ? resolve(values.get("storage-state"))
      : undefined,
  };
}

async function measureRoute(context, baseUrl, route, cacheMode) {
  const page = await context.newPage();
  let failedRequestCount = 0;
  let consoleErrorCount = 0;

  page.on("requestfailed", () => {
    failedRequestCount += 1;
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrorCount += 1;
  });

  const startedAt = Date.now();
  const response = await page.goto(new URL(route, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const domContentLoadedMs = Date.now() - startedAt;

  await page.waitForFunction(
    () => (document.body?.innerText ?? "").trim().length > 0,
    undefined,
    { timeout: 15_000 }
  );
  const firstUsableContentMs = Date.now() - startedAt;

  let networkIdleReached = true;
  try {
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  } catch {
    // Long polling is allowed; the result records that the route did not settle.
    networkIdleReached = false;
  }

  const result = {
    route,
    cacheMode,
    status: response?.status() ?? null,
    finalPathname: new URL(page.url()).pathname,
    domContentLoadedMs,
    firstUsableContentMs,
    observedForMs: Date.now() - startedAt,
    failedRequestCount,
    consoleErrorCount,
    networkIdleReached,
  };
  await page.close();
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const browser = await chromium.launch({ headless: true });
  try {
    const measurements = [];
    for (const route of options.routes) {
      const context = await browser.newContext({
        storageState: options.storageState,
        serviceWorkers: "block",
      });
      measurements.push(await measureRoute(context, options.baseUrl, route, "cold"));
      measurements.push(await measureRoute(context, options.baseUrl, route, "warm"));
      await context.close();
    }

    const report = {
      contract: "xrugc-production-route-performance-observation/v1",
      observedAt: new Date().toISOString(),
      baseOrigin: options.baseUrl,
      containsCredentialsOrResponseBodies: false,
      measurements,
    };
    await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    process.stdout.write(
      `${JSON.stringify({ status: "completed", routeCount: options.routes.length })}\n`
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  const reason = error instanceof Error ? error.message.split(":")[0] : "audit-failed";
  process.stderr.write(`${JSON.stringify({ status: "failed", reason })}\n`);
  process.exitCode = 1;
});
