#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import http from "node:http";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { lock, verifyRuntime } from "./runtime.mjs";

const image = process.argv[2];
if (!image) throw new Error("Usage: pnpm unity:smoke <main-web-image>");
const docker = (args) => {
  const result = spawnSync("docker", args, { encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(`docker ${args[0]} failed: ${result.stderr}`);
  return result.stdout.trim();
};
const request = (url, { method = "GET", headers = {}, collect = false } = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      const hash = createHash("sha256");
      let size = 0;
      const chunks = [];
      res.on("data", (chunk) => {
        hash.update(chunk);
        size += chunk.length;
        if (collect) chunks.push(chunk);
      });
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          sha256: hash.digest("hex"),
          size,
          body: Buffer.concat(chunks).toString(),
        })
      );
      res.on("error", reject);
    });
    req.setTimeout(30000, () =>
      req.destroy(new Error("HTTP verification timed out"))
    );
    req.on("error", reject);
    req.end();
  });
let container;
const temporary = await mkdtemp(path.join(os.tmpdir(), "xrugc-unity-smoke-"));
try {
  // No plugin upstream is configured; DNS for historical plugin hosts is blocked
  // only in this disposable container. Production services are never touched.
  container = docker([
    "run",
    "--detach",
    "--platform",
    "linux/amd64",
    "--publish",
    "127.0.0.1::80",
    "--add-host",
    "webgl-preview.plugins.xrugc.com:127.0.0.1",
    image,
  ]);
  docker(["cp", `${container}:/usr/share/nginx/html/webgl-preview`, temporary]);
  const active = await verifyRuntime(path.join(temporary, "webgl-preview"));
  const port = docker(["port", container, "80/tcp"]).split(":").pop();
  const origin = `http://127.0.0.1:${port}`;
  let pointer;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      pointer = await request(`${origin}/webgl-preview/active.json`, {
        collect: true,
      });
      if (pointer.status === 200) break;
    } catch {
      /* nginx startup is bounded below */
    }
    await setTimeout(250);
  }
  assert.equal(
    pointer?.status,
    200,
    "active.json must be served by final image"
  );
  assert.match(pointer.headers["cache-control"], /no-store/);
  assert.deepEqual(JSON.parse(pointer.body), active);
  const prefix = active.entrypoint.replace(/embed\.html$/, "");
  const embed = await request(`${origin}${active.entrypoint}`, {
    collect: true,
  });
  assert.equal(embed.status, 200);
  assert.match(embed.body, /unity-canvas/);
  assert.match(embed.headers["cache-control"], /no-cache/);
  assert.match(embed.headers["content-security-policy"], /connect-src 'self'/);
  assert.ok(
    !embed.headers["content-security-policy"].includes("plugins.xrugc.com")
  );
  const sw = await request(`${origin}${prefix}sw.js`, { collect: true });
  assert.equal(sw.status, 200);
  assert.equal(
    sw.headers["service-worker-allowed"],
    undefined,
    "SW maximum scope must stay inside its release"
  );
  const manifestResponse = await request(
    `${origin}${prefix}build-manifest.json`,
    { collect: true }
  );
  const manifest = JSON.parse(manifestResponse.body);
  assert.equal(manifest.buildId, lock.buildId);
  for (const file of manifest.files) {
    const url = `${origin}${prefix}${file.url}`;
    const response = await request(url);
    assert.equal(response.status, 200, file.role);
    assert.equal(
      response.headers["content-type"].split(";")[0],
      file.contentType,
      file.role
    );
    assert.equal(
      response.headers["content-encoding"] || "identity",
      file.contentEncoding,
      file.role
    );
    assert.equal(
      response.size,
      file.size,
      `${file.role} compressed transfer length`
    );
    assert.equal(response.sha256, file.sha256, `${file.role} HTTP hash`);
    assert.match(response.headers["cache-control"], /immutable/);
    const range = await request(url, { headers: { Range: "bytes=0-31" } });
    assert.equal(range.status, 206);
    assert.equal(range.size, 32);
    assert.equal(range.headers["content-range"], `bytes 0-31/${file.size}`);
  }
  for (const suffix of [
    "missing.js",
    "missing.html",
    "Build/missing.wasm.gz",
    "Build/missing.data.gz",
    "modules/missing.js",
  ]) {
    const missing = await request(`${origin}${prefix}${suffix}`, {
      collect: true,
    });
    assert.equal(missing.status, 404, suffix);
    assert.ok(
      !missing.body.includes('id="app"'),
      `${suffix} must not return the main SPA`
    );
    assert.equal(missing.headers["content-encoding"], undefined);
  }
  for (const pathname of [
    "/__xrugc_proxy__/https://example.com/test",
    "/webgl-preview/releases/000000000000000000000000/embed.html",
  ]) {
    assert.equal((await request(`${origin}${pathname}`)).status, 404);
  }
  const retention = JSON.parse(
    await readFile(
      path.join(temporary, "webgl-preview/retained-releases.json"),
      "utf8"
    )
  );
  for (const retained of retention.retained) {
    const previousPrefix = `/webgl-preview/releases/${retained.runtimeReleaseId}/`;
    assert.equal(
      (await request(`${origin}${previousPrefix}embed.html`)).status,
      200
    );
    const previousManifest = JSON.parse(
      (
        await request(`${origin}${previousPrefix}build-manifest.json`, {
          collect: true,
        })
      ).body
    );
    assert.equal(previousManifest.buildId, retained.buildId);
    for (const file of previousManifest.files) {
      const response = await request(`${origin}${previousPrefix}${file.url}`, {
        method: "HEAD",
      });
      assert.equal(response.status, 200);
      assert.equal(Number(response.headers["content-length"]), file.size);
      assert.equal(
        response.headers["content-encoding"] || "identity",
        file.contentEncoding
      );
    }
  }
  console.log(
    JSON.stringify(
      {
        passed: true,
        image,
        ...active,
        retention,
        checked: [
          "final-image inventory/hash/size/gzip/compatibility",
          "four real Unity files over HTTP",
          "MIME/encoding/Range/404",
          "active pointer/cache policy",
          "release-scoped SW",
          "old-plugin DNS blocked",
        ],
      },
      null,
      2
    )
  );
} finally {
  if (container) docker(["rm", "--force", container]);
  await rm(temporary, { recursive: true, force: true });
}
