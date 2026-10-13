#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import http from "node:http";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";

const image = process.argv[2];
const baseNginx = process.argv[3] === "--base-nginx";
if (!image || process.argv.length > (baseNginx ? 4 : 3))
  throw new Error(
    "Usage: node scripts/static-assets/container-smoke.mjs <image> [--base-nginx]"
  );
const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const temporary = await mkdtemp(
  path.join(os.tmpdir(), "xrugc-static-continuity-")
);
const containers = [];
const checked = [];
const current = path.join(temporary, "current");
const retained = path.join(temporary, "retained");
const prefix = "/js/__identity_static_smoke__";

function docker(args) {
  const result = spawnSync(process.env.DOCKER_BINARY || "docker", args, {
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw new Error(`docker ${args[0]} failed: ${result.stderr}`);
  return (
    args[0] === "logs" ? result.stdout + result.stderr : result.stdout
  ).trim();
}

async function file(root, name, value) {
  const target = path.join(root, name);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o755 });
  await writeFile(target, value, { mode: 0o644 });
}

function request(origin, pathname, { method = "GET", headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(origin);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: pathname,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        );
        res.on("error", reject);
      }
    );
    req.setTimeout(5000, () =>
      req.destroy(new Error("static smoke HTTP timeout"))
    );
    req.on("error", reject);
    req.end();
  });
}

async function start(withRetained) {
  const args = [
    "run",
    "--detach",
    "--platform",
    "linux/amd64",
    "--publish",
    "127.0.0.1::80",
    "--env",
    "APP_API_1_URL=http://127.0.0.1:18081",
    "--env",
    "APP_AUTH_1_URL=http://127.0.0.1:18081",
    "--env",
    "APP_CONFIG_1_URL=http://127.0.0.1:18081",
    "--env",
    "APP_DOC_API_URL=http://127.0.0.1:18081",
    "--mount",
    `type=bind,source=${current},target=/usr/share/nginx/html${prefix},readonly`,
    "--mount",
    `type=bind,source=${temporary}/upstream.conf,target=/etc/nginx/conf.d/static-smoke-upstream.conf,readonly`,
  ];
  if (withRetained)
    args.push(
      "--mount",
      `type=bind,source=${retained},target=/opt/identity-previous-web-assets,readonly`
    );
  if (baseNginx)
    args.push(
      "--entrypoint",
      "/bin/sh",
      "--mount",
      `type=bind,source=${temporary}/html-${withRetained},target=/usr/share/nginx/html`,
      "--mount",
      `type=bind,source=${repository}/docker-entrypoint.sh,target=/docker-entrypoint.sh,readonly`,
      "--mount",
      `type=bind,source=${repository}/nginx.conf.template,target=/etc/nginx/templates/default.conf.template,readonly`
    );
  const container = docker([
    ...args,
    image,
    ...(baseNginx ? ["/docker-entrypoint.sh"] : []),
  ]);
  containers.push(container);
  let port;
  try {
    port = docker(["port", container, "80/tcp"]).split(":").pop();
  } catch {
    throw new Error(`nginx startup failed: ${docker(["logs", container])}`);
  }
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if ((await request(origin, `${prefix}/shared.ABC.js`)).status === 200)
        return { container, origin };
    } catch {
      /* bounded nginx startup */
    }
    await setTimeout(250);
  }
  throw new Error(`nginx startup failed: ${docker(["logs", container])}`);
}

try {
  await mkdir(current, { mode: 0o755 });
  await mkdir(retained, { mode: 0o755 });
  await file(current, "shared.ABC.js", "new-current-asset");
  await file(current, "new.DEF.js", "current-only-asset");
  await file(retained, `${prefix}/shared.ABC.js`, "old-shadowed-asset");
  const assets = new Map([
    [`${prefix}/old.GHI.js`, ["old-lazy-asset", /(?:java|ecma)script/]],
    ["/css/old.GHI.css", [".old { color: green; }", /^text\/css/]],
    ["/fonts/old.GHI.woff2", [Buffer.from([1, 2, 3]), /(?:font|octet-stream)/]],
    [
      "/assets/old.GHI.wasm",
      [Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]), /^application\/wasm/],
    ],
    ["/img/old.GHI.png", [Buffer.from([137, 80, 78, 71]), /^image\/png/]],
    [
      "/resource/blockly/media/old.GHI.wav",
      ["old-audio-asset", /(?:audio|octet-stream)/],
    ],
    ["/media/video/old.GHI.mp4", ["old-video-asset", /(?:video|octet-stream)/]],
    [
      "/identity-static-old.GHI.ico",
      ["old-root-icon", /(?:image|octet-stream)/],
    ],
  ]);
  for (const [name, [body]] of assets) await file(retained, name, body);
  // Deliberately unreviewed entries prove nginx's path gate independently of the seed tool.
  const forbidden = [
    "/__env.js",
    "/env-config.js",
    "/app-release.json",
    "/index.html",
    "/retained-only.html",
    "/config/retained-only.js",
    "/config/domains/retained-only.json",
    "/api/retained-only.js",
    "/api-auth/retained-only.js",
    "/api-config/retained-only.js",
    "/api-doc/retained-only.js",
    "/outside/retained-only.js",
    "/js/.retained-secret.js",
    "/webgl-preview/retained-only.js",
  ];
  for (const name of forbidden)
    await file(retained, name, "FORBIDDEN-RETAINED-CONTENT");
  await file(retained, "not-public.txt", "DO-NOT-SERVE-LINK-TARGET");
  await symlink(
    "../../not-public.txt",
    path.join(retained, `${prefix}/linked.GHI.js`)
  );
  await file(
    temporary,
    "upstream.conf",
    'server { listen 18081; location / { default_type application/json; return 200 \'{"via":"current-upstream"}\'; } }\n'
  );
  if (baseNginx) {
    for (const mounted of [true, false]) {
      const html = path.join(temporary, `html-${mounted}`);
      await file(
        html,
        "index.html",
        '<!doctype html><div id="app">CURRENT-HTML</div><script src="/__env.js"></script>'
      );
      await file(
        html,
        "app-release.json",
        '{"schemaVersion":1,"buildTimestamp":1}'
      );
      await file(
        html,
        "config/domains/white-label-nginx-map.conf",
        "map $host $white_label_config_uri { default /config/domains/default.json; }\n"
      );
    }
  }
  const mounted = await start(true);
  const mounts = JSON.parse(
    docker(["inspect", "--format", "{{json .Mounts}}", mounted.container])
  );
  assert.equal(
    mounts.find(
      (item) => item.Destination === "/opt/identity-previous-web-assets"
    )?.RW,
    false
  );
  assert.equal(
    (await request(mounted.origin, `${prefix}/shared.ABC.js`)).body.toString(),
    "new-current-asset"
  );
  checked.push("read-only volume and new asset priority");
  for (const [name, [body, contentType]] of assets) {
    const response = await request(mounted.origin, name);
    assert.equal(response.status, 200, name);
    assert.deepEqual(response.body, Buffer.from(body), name);
    assert.match(response.headers["content-type"], contentType, name);
    assert.equal(response.headers["x-content-type-options"], "nosniff", name);
    assert.match(response.headers["cache-control"], /public/, name);
  }
  assert.match(
    (await request(mounted.origin, `${prefix}/old.GHI.js`)).headers[
      "cache-control"
    ],
    /immutable/
  );
  const range = await request(mounted.origin, `${prefix}/old.GHI.js`, {
    headers: { Range: "bytes=0-2" },
  });
  assert.equal(range.status, 206);
  assert.equal(range.body.toString(), "old");
  assert.equal(
    (await request(mounted.origin, `${prefix}/old.GHI.js`, { method: "HEAD" }))
      .status,
    200
  );
  assert.equal(
    (await request(mounted.origin, `${prefix}/old.GHI.js`, { method: "POST" }))
      .status,
    405
  );
  checked.push(
    "old JS/CSS/font/wasm/image/audio/video/root icon MIME/cache/range/HEAD and no writes"
  );
  for (const name of [
    "/js/missing.GHI.js",
    "/css/missing.GHI.css",
    "/assets/missing.GHI.wasm",
    "/img/missing.GHI.png",
    "/resource/missing.GHI.mp3",
    "/outside/retained-only.js",
    "/js/.retained-secret.js",
    "/config/retained-only.js",
    "/config/domains/retained-only.json",
    "/retained-only.html",
    "/webgl-preview/retained-only.js",
    `${prefix}/linked.GHI.js`,
  ]) {
    const response = await request(mounted.origin, name);
    assert.equal(response.status, 404, name);
    assert.ok(!response.body.toString().includes('id="app"'), name);
    assert.ok(
      !response.body.toString().includes("DO-NOT-SERVE-LINK-TARGET"),
      name
    );
  }
  for (const name of [
    "/__env.js",
    "/env-config.js",
    "/app-release.json",
    "/index.html",
    "/js/%2e%2e/__env.js",
  ]) {
    const response = await request(mounted.origin, name);
    assert.ok(
      !response.body.toString().includes("FORBIDDEN-RETAINED-CONTENT"),
      name
    );
  }
  for (const route of ["/api", "/api-auth", "/api-config", "/api-doc"]) {
    const response = await request(mounted.origin, `${route}/retained-only.js`);
    assert.equal(response.status, 200, route);
    assert.deepEqual(
      JSON.parse(response.body),
      { via: "current-upstream" },
      route
    );
  }
  checked.push(
    "missing assets 404; HTML/runtime/config/API/Unity/outside paths and symlinks never fall back"
  );
  if (!baseNginx)
    assert.equal(
      (await request(mounted.origin, "/webgl-preview/active.json")).status,
      200
    );
  const absent = await start(false);
  assert.equal(
    (await request(absent.origin, `${prefix}/new.DEF.js`)).status,
    200
  );
  assert.equal(
    (await request(absent.origin, `${prefix}/old.GHI.js`)).status,
    404
  );
  checked.push(
    "without optional volume current files work and old files return 404"
  );
  console.log(
    JSON.stringify(
      { passed: true, image, fullImage: !baseNginx, checked },
      null,
      2
    )
  );
} finally {
  for (const container of containers) docker(["rm", "--force", container]);
  await rm(temporary, { recursive: true, force: true });
}
