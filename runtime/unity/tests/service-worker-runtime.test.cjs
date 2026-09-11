const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const zlib = require("node:zlib");
const {
  BuildArtifactCoordinator,
  IncrementalSha256,
  cacheVerifiedResponse,
} = require("../public/modules/sw-build-cache");

const root = path.resolve(__dirname, "..");
const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const responseCopy = async (response) => {
  const bytes = new Uint8Array(await response.arrayBuffer());
  return new Response(bytes, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

class MemoryCache {
  constructor({ putGate = null } = {}) {
    this.entries = new Map();
    this.putGate = putGate;
    this.putCalls = 0;
    this.deleteCalls = 0;
  }

  id(key) {
    return typeof key === "string" ? key : key.url;
  }

  async match(key) {
    const response = this.entries.get(this.id(key));
    return response ? response.clone() : undefined;
  }

  async put(key, response) {
    this.putCalls += 1;
    const copy = await responseCopy(response);
    if (this.putGate) await this.putGate.promise;
    this.entries.set(this.id(key), copy);
  }

  async delete(key) {
    this.deleteCalls += 1;
    return this.entries.delete(this.id(key));
  }

  async keys() {
    return [...this.entries.keys()].map((url) => new Request(url));
  }
}

class MemoryCacheStorage {
  constructor() {
    this.named = new Map();
    this.deleted = [];
  }

  async open(name) {
    if (!this.named.has(name)) this.named.set(name, new MemoryCache());
    return this.named.get(name);
  }

  async keys() {
    return [...this.named.keys()];
  }

  async delete(name) {
    this.deleted.push(name);
    return this.named.delete(name);
  }
}

const artifact = (body, overrides = {}) => ({
  role: "wasm",
  responseSha256: sha256(body),
  ...overrides,
});

test("incremental SHA-256 matches Node crypto across arbitrary chunk boundaries", () => {
  const bytes = crypto.randomBytes(2 * 1024 * 1024 + 137);
  const hasher = new IncrementalSha256();
  let offset = 0;
  while (offset < bytes.length) {
    const length = Math.min(bytes.length - offset, 1 + ((offset * 31) % 65537));
    hasher.update(bytes.subarray(offset, offset + length));
    offset += length;
  }
  assert.equal(hasher.digestHex(), sha256(bytes));
  assert.equal(
    hasher.block.byteLength,
    64,
    "hasher retains one fixed-size tail block"
  );
});

test("cache verification hashes decoded response bytes instead of the raw gzip artifact", async () => {
  const decoded = crypto.randomBytes(1024 * 1024 + 29);
  const encoded = zlib.gzipSync(decoded);
  assert.notEqual(sha256(encoded), sha256(decoded));

  const cache = new MemoryCache();
  const key = new Request("https://preview.test/Build/public.data.gz?v=build");
  const response = new Response(decoded, {
    headers: {
      "content-encoding": "gzip",
      "content-length": String(encoded.byteLength),
    },
  });
  const file = artifact(decoded, {
    role: "data",
    sha256: sha256(encoded),
  });

  assert.equal(await cacheVerifiedResponse(cache, key, response, file), true);
  assert.equal(cache.putCalls, 1);
  assert.deepEqual(
    Buffer.from(await (await cache.match(key)).arrayBuffer()),
    decoded
  );
});

test("same-length digest mismatch is deleted and reports WGP-CACHE-MISMATCH", async () => {
  const expected = Buffer.from("expected-content");
  const corrupted = Buffer.from("corruptd-content");
  assert.equal(expected.byteLength, corrupted.byteLength);
  const cache = new MemoryCache();
  const key = new Request("https://preview.test/Build/public.wasm.gz?v=build");

  await assert.rejects(
    cacheVerifiedResponse(
      cache,
      key,
      new Response(corrupted),
      artifact(expected)
    ),
    (error) => {
      assert.equal(error.code, "WGP-CACHE-MISMATCH");
      assert.match(error.message, /WGP-CACHE-MISMATCH/);
      return true;
    }
  );
  assert.equal(await cache.match(key), undefined);
  assert.equal(cache.deleteCalls, 1);
});

test("verified cache rejects a truncated response before publishing an entry", async () => {
  const body = Buffer.from("complete-response");
  const truncated = body.subarray(0, body.length - 1);
  const cache = new MemoryCache();
  const key = new Request("https://preview.test/Build/public.data.gz?v=build");
  const file = artifact(truncated, {
    role: "data",
    responseSize: body.byteLength,
  });

  await assert.rejects(
    cacheVerifiedResponse(cache, key, new Response(truncated), file),
    (error) => error && error.code === "WGP-CACHE-MISMATCH"
  );
  assert.equal(await cache.match(key), undefined);
  assert.equal(cache.deleteCalls, 1);
});

for (const order of ["warm-first", "foreground-first"]) {
  test(`${order} consumers share one verified in-flight download`, async () => {
    const body = crypto.randomBytes(256 * 1024 + 11);
    const fetchGate = deferred();
    const putGate = deferred();
    const cache = new MemoryCache({ putGate });
    let fetchCalls = 0;
    const coordinator = new BuildArtifactCoordinator({
      fetchImpl: async () => {
        fetchCalls += 1;
        return fetchGate.promise;
      },
    });
    const key = new Request(
      "https://preview.test/Build/public.wasm.gz?v=build"
    );
    const options = {
      cache,
      key,
      request: key,
      file: artifact(body),
    };

    let warm;
    let foreground;
    if (order === "warm-first") {
      warm = coordinator.warm(options);
      foreground = coordinator.foreground(options);
    } else {
      foreground = coordinator.foreground(options);
      warm = coordinator.warm(options);
    }

    await Promise.resolve();
    assert.equal(fetchCalls, 1);
    assert.equal(coordinator.size, 1);
    fetchGate.resolve(new Response(body));

    const foregroundResponse = await foreground.response;
    assert.equal(
      cache.putCalls,
      1,
      "verified cache write starts with streaming response"
    );
    let warmSettled = false;
    warm.completion.then(() => {
      warmSettled = true;
    });
    await Promise.resolve();
    assert.equal(
      warmSettled,
      false,
      "foreground does not wait for cache completion"
    );
    assert.deepEqual(Buffer.from(await foregroundResponse.arrayBuffer()), body);

    putGate.resolve();
    assert.equal(await warm.completion, true);
    await foreground.completion;
    assert.equal(fetchCalls, 1);
    assert.equal(coordinator.size, 0);
  });
}

test("cancelling one shared consumer does not abort the remaining foreground request", async () => {
  const body = crypto.randomBytes(64 * 1024 + 3);
  const fetchGate = deferred();
  const cache = new MemoryCache();
  let networkSignal;
  let fetchCalls = 0;
  const coordinator = new BuildArtifactCoordinator({
    fetchImpl: (_request, { signal }) => {
      fetchCalls += 1;
      networkSignal = signal;
      return fetchGate.promise;
    },
  });
  const key = new Request(
    "https://preview.test/Build/public.framework.js.gz?v=build"
  );
  const warmController = new AbortController();
  const foregroundController = new AbortController();
  const options = {
    cache,
    key,
    request: key,
    file: artifact(body, { role: "framework" }),
  };

  const warm = coordinator.warm({ ...options, signal: warmController.signal });
  const foreground = coordinator.foreground({
    ...options,
    signal: foregroundController.signal,
  });
  await Promise.resolve();
  warmController.abort();
  await assert.rejects(warm.completion, { name: "AbortError" });
  assert.equal(networkSignal.aborted, false);

  fetchGate.resolve(new Response(body));
  assert.deepEqual(
    Buffer.from(await (await foreground.response).arrayBuffer()),
    body
  );
  await foreground.completion;
  assert.equal(fetchCalls, 1);
  assert.equal(networkSignal.aborted, false);
  assert.equal(coordinator.size, 0);
});

test("the underlying in-flight fetch aborts when its final consumer cancels", async () => {
  const cache = new MemoryCache();
  let networkSignal;
  const coordinator = new BuildArtifactCoordinator({
    fetchImpl: (_request, { signal }) => {
      networkSignal = signal;
      return new Promise((_resolve, reject) => {
        const rejectAbort = () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (signal.aborted) rejectAbort();
        else signal.addEventListener("abort", rejectAbort, { once: true });
      });
    },
  });
  const key = new Request(
    "https://preview.test/Build/public.loader.js?v=build"
  );
  const controller = new AbortController();
  const warm = coordinator.warm({
    cache,
    key,
    request: key,
    file: artifact(Buffer.from("loader"), { role: "loader" }),
    signal: controller.signal,
  });

  await Promise.resolve();
  controller.abort();
  await assert.rejects(warm.completion, { name: "AbortError" });
  assert.equal(networkSignal.aborted, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(coordinator.size, 0);
});

const loadServiceWorker = ({
  fetchImpl,
  caches,
  postedMessages = [],
  activeClients = [],
  scope = "https://preview.test/",
}) => {
  const listeners = new Map();
  const context = vm.createContext({
    AbortController,
    ArrayBuffer,
    DOMException,
    Headers,
    Map,
    Promise,
    ReadableStream,
    Request,
    Response,
    Set,
    TransformStream,
    Uint8Array,
    URL,
    clearTimeout,
    console: {
      error: console.error,
      log: console.log,
      warn() {},
    },
    fetch: fetchImpl,
    setTimeout,
  });
  context.globalThis = context;
  context.self = context;
  context.location = new URL(scope);
  context.registration = { scope };
  context.clients = {
    claim: async () => {},
    matchAll: async () => activeClients,
    get: async () => ({
      postMessage(message) {
        postedMessages.push(message);
      },
    }),
  };
  context.skipWaiting = async () => {};
  context.caches = caches;
  context.addEventListener = (type, listener) => listeners.set(type, listener);
  context.importScripts = () => {};

  vm.runInContext(
    fs.readFileSync(
      path.join(root, "public/modules/sw-build-cache.js"),
      "utf8"
    ),
    context,
    { filename: "sw-build-cache.js" }
  );
  vm.runInContext(
    `${fs.readFileSync(path.join(root, "public/sw.js"), "utf8")}\n` +
      "globalThis.__SW_TEST__ = {" +
      " handleBuildRequest, handleSceneResourceRequest, warmPreviewCache," +
      " getBuildManifest, buildCacheName, buildCacheKey, pruneOldBuildCaches," +
      " buildArtifactCoordinator, isDirectStreamBuildRequest," +
      " buildCacheReadyKey, hasVerifiedLargeBuildFile" +
      "};",
    context,
    { filename: "sw.js" }
  );
  return {
    ...context.__SW_TEST__,
    async dispatchFetch(request) {
      let responsePromise;
      const pending = [];
      listeners.get("fetch")({
        request,
        clientId: "preview-client",
        respondWith(promise) {
          responsePromise = Promise.resolve(promise);
        },
        waitUntil(promise) {
          pending.push(promise);
        },
      });
      assert.ok(
        responsePromise,
        `Service Worker did not intercept ${request.url}`
      );
      const response = await responsePromise;
      await Promise.all(pending);
      return response;
    },
    async dispatchMessage(
      data,
      source = { id: "preview-client", url: new URL("embed.html", scope).href }
    ) {
      const pending = [];
      listeners.get("message")({
        data,
        source,
        waitUntil(promise) {
          pending.push(promise);
        },
      });
      await Promise.all(pending);
    },
    dispatchFetchIsIntercepted(request) {
      let intercepted = false;
      listeners.get("fetch")({
        request,
        clientId: "preview-client",
        respondWith() {
          intercepted = true;
        },
        waitUntil() {},
      });
      return intercepted;
    },
  };
};

const runtimeManifest = ({ loaderResponseSha256 = "c".repeat(64) } = {}) => ({
  schemaVersion: 1,
  buildId: `sha256:${"a".repeat(64)}`,
  totalSize: 4,
  files: ["loader", "data", "framework", "wasm"].map((role) => ({
    role,
    url: `Build/public.${role === "loader" ? "loader.js" : `${role}.gz`}`,
    size: 1,
    sha256: "b".repeat(64),
    responseSha256: role === "loader" ? loaderResponseSha256 : "c".repeat(64),
    responseSize: 1,
    contentEncoding: role === "loader" ? "identity" : "gzip",
    contentType: "application/octet-stream",
  })),
});

const cachePrefix = (scope) =>
  `xrugc-main-unity-${new URL(scope).pathname.split("/").filter(Boolean).pop()}-`;
const scopeCases = [
  {
    label: "release A",
    scope:
      "https://preview.test/webgl-preview/releases/111111111111111111111111/",
  },
  {
    label: "release B",
    scope:
      "https://preview.test/webgl-preview/releases/222222222222222222222222/",
  },
];

for (const { label, scope } of scopeCases) {
  test(`${label}: Platform API alias bypasses every Service Worker cache`, async () => {
    const storage = new MemoryCacheStorage();
    const requests = [];
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: async (request) => {
        requests.push(request);
        return new Response('{"success":true}', {
          headers: { "content-type": "application/json" },
        });
      },
    });
    const request = new Request(
      new URL("platform-api/v1/verses?page=1", scope),
      { headers: { Authorization: "Bearer scene-list-test" } }
    );

    const response = await runtime.dispatchFetch(request);

    assert.equal(response.status, 200);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, request.url);
    assert.equal(
      requests[0].headers.get("authorization"),
      "Bearer scene-list-test"
    );
    assert.deepEqual(await storage.keys(), []);
  });

  test(`${label}: legacy Unity asset alias uses the strict scene-resource boundary`, async () => {
    const storage = new MemoryCacheStorage();
    const upstreamRequests = [];
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: async (request, options) => {
        upstreamRequests.push({ request, options });
        return new Response("legacy-scene-asset", {
          headers: { "content-type": "model/gltf-binary" },
        });
      },
    });
    const target =
      label === "root"
        ? "https://mrpp-1257979353.cos.ap-chengdu.myqcloud.com/scenes/demo.glb?sign=short-lived#ignored"
        : "https://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/scenes/demo.png?sign=short-lived#ignored";
    const alias = new URL("__xrugc_proxy__", scope);
    alias.searchParams.set("url", target);
    const request = new Request(alias, {
      headers: {
        Authorization: "Bearer platform-token-must-not-leak",
        Cookie: "session=must-not-leak",
        "If-None-Match": "scene-etag",
      },
    });

    const response = await runtime.dispatchFetch(request);

    assert.equal(await response.text(), "legacy-scene-asset");
    assert.equal(upstreamRequests.length, 1);
    assert.equal(upstreamRequests[0].request, target.replace(/#.*$/, ""));
    assert.equal(upstreamRequests[0].options.method, "GET");
    assert.equal(upstreamRequests[0].options.mode, "cors");
    assert.equal(upstreamRequests[0].options.credentials, "omit");
    assert.equal(upstreamRequests[0].options.redirect, "error");
    assert.equal(
      upstreamRequests[0].options.headers.get("if-none-match"),
      "scene-etag"
    );
    assert.equal(
      upstreamRequests[0].options.headers.get("authorization"),
      null
    );
    assert.equal(upstreamRequests[0].options.headers.get("cookie"), null);
  });

  test(`${label}: legacy Unity asset alias rejects non-allowlisted targets before fetch`, async () => {
    const storage = new MemoryCacheStorage();
    let upstreamRequests = 0;
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: async () => {
        upstreamRequests += 1;
        return new Response("must not be reached");
      },
    });
    const hostileTargets = [
      "http://data.7dgame.com/scenes/demo.glb",
      "https://example.com/scenes/demo.glb",
      "https://data.7dgame.com:8443/scenes/demo.glb",
      "https://data.7dgame.com.evil.example/scenes/demo.glb",
      "http://mrpp-1257979353.cos.ap-chengdu.myqcloud.com/scenes/demo.glb",
      "https://mrpp-1257979353.cos.ap-chengdu.myqcloud.com.evil.example/scenes/demo.glb",
      "https://user:password@data.7dgame.com/scenes/demo.glb",
      "https://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/scenes/demo.exe",
      "",
    ];

    for (const target of hostileTargets) {
      const alias = new URL("__xrugc_proxy__", scope);
      alias.searchParams.set("url", target);
      const response = await runtime.dispatchFetch(new Request(alias));
      assert.equal(response.status, 400, target || "empty URL");
      assert.equal(await response.text(), "Invalid scene resource URL");
    }

    assert.equal(upstreamRequests, 0);
    assert.deepEqual(await storage.keys(), []);
  });

  test(`${label}: both scene aliases allow data/media fetches and block active-content contexts`, async () => {
    const storage = new MemoryCacheStorage();
    let upstreamRequests = 0;
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: async () => {
        upstreamRequests += 1;
        return new Response("scene-resource");
      },
    });
    const target =
      "https://mrpp-1257979353.cos.ap-chengdu.myqcloud.com/scenes/station.glb";
    const requestFor = (endpoint, destination, mode = "cors") => {
      const alias = new URL(endpoint, scope);
      alias.searchParams.set("url", target);
      const request = new Request(alias);
      Object.defineProperty(request, "destination", { value: destination });
      Object.defineProperty(request, "mode", { value: mode });
      return request;
    };

    for (const endpoint of ["__xrugc_scene_resource__", "__xrugc_proxy__"]) {
      for (const destination of ["", "image", "audio", "video"]) {
        const response = await runtime.dispatchFetch(
          requestFor(endpoint, destination)
        );
        assert.equal(
          response.status,
          200,
          `${endpoint} ${destination || "empty"}`
        );
      }

      for (const destination of [
        "script",
        "style",
        "worker",
        "sharedworker",
        "serviceworker",
        "document",
        "object",
        "embed",
      ]) {
        const response = await runtime.dispatchFetch(
          requestFor(endpoint, destination)
        );
        assert.equal(response.status, 403, `${endpoint} ${destination}`);
        assert.equal(
          await response.text(),
          "Scene resource request context is not allowed"
        );
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      }

      const navigation = await runtime.dispatchFetch(
        requestFor(endpoint, "document", "navigate")
      );
      assert.equal(navigation.status, 403, `${endpoint} navigate`);
    }

    assert.equal(upstreamRequests, 8);
  });
}

const buildFixture = (revisionDigit) => {
  const buildId = `sha256:${revisionDigit.repeat(64)}`;
  const definitions = [
    ["loader", "Build/public.loader.js"],
    ["data", "Build/public.data.gz"],
    ["framework", "Build/public.framework.js.gz"],
    ["wasm", "Build/public.wasm.gz"],
  ];
  const bodies = new Map();
  const files = definitions.map(([role, url], index) => {
    const body = Buffer.from(`${revisionDigit}:${role}:verified:${index}`);
    bodies.set(url, body);
    return {
      role,
      url,
      size: body.byteLength,
      sha256: sha256(body),
      responseSha256: sha256(body),
      responseSize: body.byteLength,
      contentEncoding: "identity",
      contentType:
        role === "loader" || role === "framework"
          ? "application/javascript"
          : "application/octet-stream",
    };
  });
  return {
    bodies,
    manifest: {
      schemaVersion: 1,
      buildId,
      totalSize: files.reduce((total, file) => total + file.size, 0),
      files,
    },
  };
};

const buildRequest = (scope, file, buildId, init) => {
  const url = new URL(file.url, scope);
  url.searchParams.set("v", buildId);
  return new Request(url, init);
};

const fixtureFetch =
  ({ fixture, scope, artifactRequests = [], artifactResponse }) =>
  async (request, options = {}) => {
    const url = new URL(request.url || request);
    if (url.href === new URL("build-manifest.json", scope).href) {
      return new Response(JSON.stringify(fixture.manifest), {
        headers: { "content-type": "application/json" },
      });
    }
    const file = fixture.manifest.files.find(
      (entry) => new URL(entry.url, scope).pathname === url.pathname
    );
    if (!file) return new Response("not found", { status: 404 });
    artifactRequests.push({ file, request, options });
    if (artifactResponse) return artifactResponse(file, request, options);
    const body = fixture.bodies.get(file.url);
    return new Response(body, {
      headers: {
        "content-length": String(body.byteLength),
        "content-type": file.contentType,
      },
    });
  };

const warmRuntime = async ({
  fixture,
  scope,
  storage,
  postedMessages = [],
}) => {
  const artifactRequests = [];
  const runtime = loadServiceWorker({
    scope,
    caches: storage,
    postedMessages,
    fetchImpl: fixtureFetch({ fixture, scope, artifactRequests }),
  });
  await runtime.dispatchMessage({ type: "warm-webgl-preview-cache" });
  return { artifactRequests, runtime };
};

test("runtime mismatch never completes cache and posts WGP-CACHE-MISMATCH", async () => {
  const expected = Buffer.from("expected-content");
  const corrupted = Buffer.from("corruptd-content");
  const manifest = runtimeManifest({ loaderResponseSha256: sha256(expected) });
  manifest.files.find((file) => file.role === "loader").size =
    corrupted.byteLength;
  manifest.totalSize = manifest.files.reduce(
    (total, file) => total + file.size,
    0
  );
  const storage = new MemoryCacheStorage();
  const postedMessages = [];
  const pending = [];
  const runtime = loadServiceWorker({
    postedMessages,
    fetchImpl: async (request) => {
      const url = new URL(request.url || request);
      if (url.pathname.endsWith("/build-manifest.json")) {
        return new Response(JSON.stringify(manifest), {
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(corrupted, {
        headers: { "content-length": String(corrupted.byteLength) },
      });
    },
    caches: storage,
  });
  const request = new Request(
    `https://preview.test/Build/public.loader.js?v=${manifest.buildId}`
  );
  const response = await runtime.handleBuildRequest({
    request,
    clientId: "preview-client",
    waitUntil(promise) {
      pending.push(promise);
    },
  });

  assert.deepEqual(Buffer.from(await response.arrayBuffer()), corrupted);
  await Promise.all(pending);
  const buildCache = await storage.open(runtime.buildCacheName(manifest));
  assert.equal(buildCache.entries.size, 0);
  assert.equal(
    postedMessages.some(
      (message) =>
        message.status === "error" && message.code === "WGP-CACHE-MISMATCH"
    ),
    true
  );
  assert.equal(
    postedMessages.some((message) => message.status === "complete"),
    false
  );
});

for (const { label, scope } of scopeCases) {
  test(`${label}: version upgrade warms all files then performs bounded rollback cleanup`, async () => {
    const fixture = buildFixture("9");
    const storage = new MemoryCacheStorage();
    const oldNames = ["1", "2", "3", "4"].map(
      (digit) => `${cachePrefix(scope)}build-v3-${digit.repeat(64)}`
    );
    for (const name of oldNames) await storage.open(name);
    const postedMessages = [];

    const { artifactRequests, runtime } = await warmRuntime({
      fixture,
      scope,
      storage,
      postedMessages,
    });

    assert.equal(artifactRequests.length, 4);
    const currentName = runtime.buildCacheName(fixture.manifest);
    const names = await storage.keys();
    assert.equal(names.includes(currentName), true);
    assert.equal(names.includes(cachePrefix(scope) + "meta-v1"), true);
    assert.deepEqual(
      oldNames.map((name) => names.includes(name)),
      [false, false, true, true]
    );
    assert.deepEqual(storage.deleted, oldNames.slice(0, 2));
    const currentCache = await storage.open(currentName);
    assert.equal(currentCache.entries.size, 4);
    assert.equal(
      postedMessages.some(
        (message) =>
          message.status === "complete" &&
          message.buildId === fixture.manifest.buildId
      ),
      true
    );
  });

  test(`${label}: cache warm skips oversized artifacts`, async () => {
    const fixture = buildFixture("8");
    const dataFile = fixture.manifest.files.find(
      (file) => file.role === "data"
    );
    dataFile.size = 64 * 1024 * 1024 + 1;
    fixture.manifest.totalSize = fixture.manifest.files.reduce(
      (total, file) => total + file.size,
      0
    );
    const storage = new MemoryCacheStorage();
    const postedMessages = [];

    const { artifactRequests, runtime } = await warmRuntime({
      fixture,
      scope,
      storage,
      postedMessages,
    });

    assert.deepEqual(
      artifactRequests.map(({ file }) => file.role),
      ["loader", "framework", "wasm"]
    );
    const currentCache = await storage.open(
      runtime.buildCacheName(fixture.manifest)
    );
    assert.equal(currentCache.entries.size, 3);
    const incomplete = postedMessages.find(
      (message) => message.status === "incomplete"
    );
    assert.ok(incomplete);
    assert.deepEqual(Array.from(incomplete.streamedFiles), [dataFile.url]);
    assert.equal(
      postedMessages.some((message) => message.status === "error"),
      false
    );
    assert.equal(
      postedMessages.some((message) => message.status === "complete"),
      false
    );
  });

  test(`${label}: a partial verified warm resumes without downloading cached files`, async () => {
    const fixture = buildFixture("8");
    const storage = new MemoryCacheStorage();
    const artifactRequests = [];
    const postedMessages = [];
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      postedMessages,
      fetchImpl: fixtureFetch({ fixture, scope, artifactRequests }),
    });
    const cache = await storage.open(runtime.buildCacheName(fixture.manifest));
    const loader = fixture.manifest.files.find(
      (file) => file.role === "loader"
    );
    const loaderRequest = buildRequest(scope, loader, fixture.manifest.buildId);
    await cache.put(
      runtime.buildCacheKey(loaderRequest, fixture.manifest),
      new Response(fixture.bodies.get(loader.url))
    );

    await runtime.dispatchMessage({ type: "warm-webgl-preview-cache" });

    assert.deepEqual(
      artifactRequests.map(({ file }) => file.role),
      ["data", "framework", "wasm"]
    );
    assert.equal(cache.entries.size, 4);
    assert.equal(
      postedMessages.some((message) => message.status === "complete"),
      true
    );
  });

  test(`${label}: interrupted prewarm aborts its fetch and preserves rollback caches`, async () => {
    const fixture = buildFixture("7");
    const storage = new MemoryCacheStorage();
    const rollbackName = `${cachePrefix(scope)}build-v3-${"6".repeat(64)}`;
    await storage.open(rollbackName);
    const artifactStarted = deferred();
    const postedMessages = [];
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      postedMessages,
      fetchImpl: fixtureFetch({
        fixture,
        scope,
        artifactResponse: (_file, _request, { signal }) => {
          artifactStarted.resolve(signal);
          return new Promise((_resolve, reject) => {
            const rejectAbort = () => {
              const error = new Error("prewarm aborted");
              error.name = "AbortError";
              reject(error);
            };
            if (signal.aborted) rejectAbort();
            else signal.addEventListener("abort", rejectAbort, { once: true });
          });
        },
      }),
    });

    const warming = runtime.dispatchMessage({
      type: "warm-webgl-preview-cache",
    });
    const networkSignal = await artifactStarted.promise;
    await runtime.dispatchMessage({ type: "cancel-webgl-preview-cache" });
    await warming;

    assert.equal(networkSignal.aborted, true);
    assert.equal((await storage.keys()).includes(rollbackName), true);
    assert.equal(storage.deleted.includes(rollbackName), false);
    assert.equal(
      postedMessages.some((message) => message.status === "cancelled"),
      true
    );
    assert.equal(
      postedMessages.some((message) => message.status === "complete"),
      false
    );
  });

  test(`${label}: offline reload serves the verified build and cached manifest`, async () => {
    const fixture = buildFixture("5");
    const storage = new MemoryCacheStorage();
    await warmRuntime({ fixture, scope, storage });
    let offlineFetches = 0;
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: async () => {
        offlineFetches += 1;
        throw new Error("offline");
      },
    });
    const loader = fixture.manifest.files.find(
      (file) => file.role === "loader"
    );
    const request = buildRequest(scope, loader, fixture.manifest.buildId);

    const response = await runtime.handleBuildRequest({ request });

    assert.deepEqual(
      Buffer.from(await response.arrayBuffer()),
      fixture.bodies.get(loader.url)
    );
    assert.equal(offlineFetches, 1, "only the manifest network probe occurs");
    assert.equal(runtime.buildArtifactCoordinator.size, 0);
  });

  test(`${label}: retained revisions never mix with current fixed-path artifacts`, async () => {
    const oldFixture = buildFixture("3");
    const currentFixture = buildFixture("4");
    const storage = new MemoryCacheStorage();
    const artifactRequests = [];
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: fixtureFetch({
        fixture: currentFixture,
        scope,
        artifactRequests,
      }),
    });
    const oldLoader = oldFixture.manifest.files.find(
      (file) => file.role === "loader"
    );
    const oldRequest = buildRequest(
      scope,
      oldLoader,
      oldFixture.manifest.buildId
    );
    const oldCache = await storage.open(
      runtime.buildCacheName(oldFixture.manifest)
    );
    await oldCache.put(
      runtime.buildCacheKey(oldRequest, oldFixture.manifest),
      new Response(oldFixture.bodies.get(oldLoader.url))
    );

    const oldResponse = await runtime.handleBuildRequest({
      request: oldRequest,
    });
    assert.deepEqual(
      Buffer.from(await oldResponse.arrayBuffer()),
      oldFixture.bodies.get(oldLoader.url)
    );
    assert.equal(artifactRequests.length, 0);

    const unavailableId = `sha256:${"f".repeat(64)}`;
    const unavailableRequest = buildRequest(
      scope,
      currentFixture.manifest.files[0],
      unavailableId
    );
    const unavailable = await runtime.handleBuildRequest({
      request: unavailableRequest,
    });
    assert.equal(unavailable.status, 409);
    assert.match(await unavailable.text(), /WGP-CACHE-REVISION/);
    assert.equal(artifactRequests.length, 0);
  });

  test(`${label}: Unity Range requests bypass build cache and coordination`, async () => {
    const fixture = buildFixture("2");
    const body = Buffer.from("range-byte");
    const storage = new MemoryCacheStorage();
    const artifactRequests = [];
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: fixtureFetch({
        fixture,
        scope,
        artifactRequests,
        artifactResponse: async () =>
          new Response(body, {
            status: 206,
            headers: { "content-range": "bytes 0-0/10" },
          }),
      }),
    });
    const request = buildRequest(
      scope,
      fixture.manifest.files[0],
      fixture.manifest.buildId,
      { headers: { Range: "bytes=0-0" } }
    );

    const response = await runtime.handleBuildRequest({ request });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), "bytes 0-0/10");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
    assert.equal(artifactRequests.length, 1);
    assert.equal(runtime.buildArtifactCoordinator.size, 0);
    assert.deepEqual(await storage.keys(), [cachePrefix(scope) + "meta-v1"]);
  });

  test(`${label}: large Unity data responses stream directly without cache coordination`, async () => {
    const fixture = buildFixture("6");
    const dataFile = fixture.manifest.files.find(
      (file) => file.role === "data"
    );
    dataFile.size = 64 * 1024 * 1024 + 1;
    dataFile.responseSize = fixture.bodies.get(dataFile.url).byteLength;
    fixture.manifest.totalSize = fixture.manifest.files.reduce(
      (total, file) => total + file.size,
      0
    );
    const storage = new MemoryCacheStorage();
    const artifactRequests = [];
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: fixtureFetch({ fixture, scope, artifactRequests }),
    });
    const request = buildRequest(scope, dataFile, fixture.manifest.buildId);

    assert.equal(runtime.isDirectStreamBuildRequest(request.url), true);
    assert.equal(runtime.dispatchFetchIsIntercepted(request), false);

    const response = await runtime.handleBuildRequest({ request });

    assert.deepEqual(
      Buffer.from(await response.arrayBuffer()),
      fixture.bodies.get(dataFile.url)
    );
    assert.equal(artifactRequests.length, 1);
    assert.equal(runtime.buildArtifactCoordinator.size, 0);
    assert.deepEqual(await storage.keys(), [cachePrefix(scope) + "meta-v1"]);
  });

  test(`${label}: a fully verified large Unity data entry is served only with its ready marker`, async () => {
    const fixture = buildFixture("6");
    const dataFile = fixture.manifest.files.find(
      (file) => file.role === "data"
    );
    dataFile.size = 64 * 1024 * 1024 + 1;
    dataFile.responseSize = fixture.bodies.get(dataFile.url).byteLength;
    fixture.manifest.totalSize = fixture.manifest.files.reduce(
      (total, file) => total + file.size,
      0
    );
    const storage = new MemoryCacheStorage();
    const artifactRequests = [];
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: fixtureFetch({ fixture, scope, artifactRequests }),
    });
    const cache = await storage.open(runtime.buildCacheName(fixture.manifest));
    const request = buildRequest(scope, dataFile, fixture.manifest.buildId);
    await cache.put(
      runtime.buildCacheKey(request, fixture.manifest),
      new Response(fixture.bodies.get(dataFile.url))
    );

    const readyRequestUrl = new URL(request.url);
    readyRequestUrl.searchParams.set("__xrugc_cache_ready", "1");
    const readyRequest = new Request(readyRequestUrl);
    assert.equal(runtime.dispatchFetchIsIntercepted(readyRequest), true);
    const missingMarker = await runtime.dispatchFetch(readyRequest);
    assert.equal(missingMarker.status, 409);
    assert.match(await missingMarker.text(), /WGP-CACHE-MISS/);

    await cache.put(
      runtime.buildCacheReadyKey(fixture.manifest, dataFile),
      new Response(
        JSON.stringify({
          buildId: fixture.manifest.buildId,
          role: dataFile.role,
          responseSha256: dataFile.responseSha256,
          responseSize: dataFile.responseSize,
        })
      )
    );
    assert.equal(
      await runtime.hasVerifiedLargeBuildFile(
        cache,
        fixture.manifest,
        dataFile
      ),
      true
    );
    const cached = await runtime.dispatchFetch(readyRequest);
    assert.deepEqual(
      Buffer.from(await cached.arrayBuffer()),
      fixture.bodies.get(dataFile.url)
    );
    assert.equal(artifactRequests.length, 0);
  });

  test(`${label}: an oversized streaming build response is returned without buffering`, async () => {
    const fixture = buildFixture("1");
    fixture.manifest.totalSize = 768 * 1024 * 1024 + 1;
    const storage = new MemoryCacheStorage();
    const artifactRequests = [];
    let streamCancelled = false;
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: fixtureFetch({
        fixture,
        scope,
        artifactRequests,
        artifactResponse: async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array([1]));
              },
              cancel() {
                streamCancelled = true;
              },
            })
          ),
      }),
    });
    const request = buildRequest(
      scope,
      fixture.manifest.files[0],
      fixture.manifest.buildId
    );

    const timeout = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("oversized response was buffered")),
        100
      )
    );
    const response = await Promise.race([
      runtime.handleBuildRequest({ request }),
      timeout,
    ]);

    assert.equal(artifactRequests.length, 1);
    assert.equal(runtime.buildArtifactCoordinator.size, 0);
    assert.deepEqual(await storage.keys(), [cachePrefix(scope) + "meta-v1"]);
    await response.body.cancel();
    assert.equal(streamCancelled, true);
  });
}

for (const { label, scope } of scopeCases) {
  test(`${label}: root historical alias is confined to the same strict resource policy`, async () => {
    const requests = [];
    const runtime = loadServiceWorker({
      scope,
      caches: new MemoryCacheStorage(),
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return new Response("model");
      },
    });
    const url = new URL("/__xrugc_proxy__", scope);
    url.searchParams.set("url", "https://data.7dgame.com/models/test.glb");
    const request = new Request(url, {
      headers: { Authorization: "must-not-leak", Cookie: "must-not-leak" },
    });
    assert.equal((await runtime.dispatchFetch(request)).status, 200);
    assert.equal(requests[0].options.credentials, "omit");
    assert.equal(requests[0].options.referrerPolicy, "no-referrer");
    assert.equal(requests[0].options.headers.get("authorization"), null);
    assert.equal(requests[0].options.headers.get("cookie"), null);
    url.searchParams.set("url", "https://attacker.test/script.js");
    assert.equal((await runtime.dispatchFetch(new Request(url))).status, 400);
    assert.equal(requests.length, 1);
  });
  test(`${label}: the worker never intercepts main site or another runtime release`, () => {
    const runtime = loadServiceWorker({
      scope,
      caches: new MemoryCacheStorage(),
      fetchImpl: () => assert.fail("outside fetch"),
    });
    for (const path of [
      "/",
      "/login",
      "/api/v1/verses",
      "/webgl-preview/releases/333333333333333333333333/Build/public.wasm.gz",
    ]) {
      assert.equal(
        runtime.dispatchFetchIsIntercepted(new Request(new URL(path, scope))),
        false,
        path
      );
    }
  });
  test(`${label}: worker cache commands reject missing and foreign release clients`, async () => {
    const storage = new MemoryCacheStorage();
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      fetchImpl: () => assert.fail("untrusted command fetched"),
    });
    for (const source of [
      null,
      { id: "host", url: "https://preview.test/" },
      { id: "wrong", url: "https://evil.test/" },
    ]) {
      await runtime.dispatchMessage(
        { type: "warm-webgl-preview-cache" },
        source
      );
    }
    assert.deepEqual(await storage.keys(), []);
  });
  test(`${label}: pruning never deletes an active release, independent plugin or another release cache`, async () => {
    const storage = new MemoryCacheStorage();
    const fixture = buildFixture("8");
    const sameReleaseOldCaches = ["1", "2", "3", "4"].map(
      (digit) => `${cachePrefix(scope)}build-v3-${digit.repeat(64)}`
    );
    const foreignCaches = [
      "xrugc-webgl-preview-build-v3-original-plugin",
      "xrugc-main-unity-333333333333333333333333-build-v3-previous",
    ];
    for (const name of [...sameReleaseOldCaches, ...foreignCaches])
      await storage.open(name);
    const runtime = loadServiceWorker({
      scope,
      caches: storage,
      activeClients: [{ url: new URL("embed.html", scope).href }],
      fetchImpl: () => assert.fail("prune downloaded"),
    });
    await runtime.pruneOldBuildCaches(fixture.manifest);
    assert.deepEqual(storage.deleted, []);
    assert.deepEqual(await storage.keys(), [
      ...sameReleaseOldCaches,
      ...foreignCaches,
    ]);
  });
}
