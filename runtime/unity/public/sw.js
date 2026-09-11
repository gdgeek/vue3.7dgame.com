importScripts("modules/sw-build-cache.js");

const { BuildArtifactCoordinator } = self.WebGlBuildCacheCore;
const BUILD_MANIFEST_PATH = "build-manifest.json";
// Every release is immutable and owns a narrow registration scope. Cache
// namespaces never overlap the independent plugin or another runtime release.
const RELEASE_ID = new URL(self.registration.scope).pathname.split("/").filter(Boolean).pop();
const OWNED_CACHE_PREFIX = `xrugc-main-unity-${RELEASE_ID}-`;
const BUILD_META_CACHE_NAME = `${OWNED_CACHE_PREFIX}meta-v1`;
// v3 entries are guaranteed to have passed responseSha256 verification.
// Never reuse v2 entries because they were accepted by Content-Length alone.
const BUILD_CACHE_PREFIX = `${OWNED_CACHE_PREFIX}build-v3-`;
const SCENE_CACHE_PREFIX = `${OWNED_CACHE_PREFIX}scene-v2-`;
const SCENE_CACHE_NAME = `${SCENE_CACHE_PREFIX}resources`;
const SCENE_RESOURCE_ENDPOINT = "__xrugc_scene_resource__";
// The checked-in Unity build still emits this historical same-origin URL.
// It is only an alternate entry point into the exact scene-resource policy
// below; nginx continues to expose no arbitrary upstream proxy.
const LEGACY_SCENE_RESOURCE_ENDPOINT = "__xrugc_proxy__";
const PLATFORM_API_ALIAS_SEGMENT = "platform-api";
const BUILD_REVISION_QUERY = "__xrugc_build";
const BUILD_CACHE_READY_QUERY = "__xrugc_cache_ready";
const BUILD_CACHE_READY_PATH = "__xrugc_build_cache_ready__";
const BUILD_CACHE_MAX_ENTRIES = 8;
const BUILD_CACHE_MAX_BYTES = 768 * 1024 * 1024;
const BUILD_CACHE_MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const RETAINED_OLD_BUILD_CACHES = 2;
const SCENE_CACHE_MAX_ENTRIES = 120;
const SCENE_CACHE_MAX_BYTES = 128 * 1024 * 1024;
const SCENE_CACHE_MAX_ENTRY_BYTES = 32 * 1024 * 1024;
const SCENE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const WARM_FILE_TIMEOUT_MS = 15000;
const BUILD_INFLIGHT_MAX_ENTRIES = 8;
const BUILD_INFLIGHT_MAX_FOREGROUND_CONSUMERS = 4;
const ALLOWED_SCENE_RESOURCE_HOSTS = new Set([
  "data.7dgame.com",
  "7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com",
  "mrpp-1257979353.cos.ap-chengdu.myqcloud.com",
]);
const ALLOWED_SCENE_RESOURCE_DESTINATIONS = new Set([
  "",
  "image",
  "audio",
  "video",
]);
const SCENE_RESOURCE_PATH_RE =
  /\.(?:png|jpe?g|gif|webp|bmp|svg|mp3|wav|ogg|m4a|mp4|webm|glb|gltf|fbx|obj|vox)(?:[?#]|$)/i;

let manifestPromise = null;
let warmAbortController = null;
const buildArtifactCoordinator = new BuildArtifactCoordinator({
  maxInflight: BUILD_INFLIGHT_MAX_ENTRIES,
  maxForegroundConsumers: BUILD_INFLIGHT_MAX_FOREGROUND_CONSUMERS,
});

const scopeUrl = (relativePath) =>
  new URL(relativePath.replace(/^\/+/, ""), self.registration.scope);

const buildCacheName = (manifest) =>
  `${BUILD_CACHE_PREFIX}${manifest.buildId.replace(/^sha256:/, "")}`;

const buildCacheNameForId = (buildId) =>
  `${BUILD_CACHE_PREFIX}${String(buildId || "").replace(/^sha256:/, "")}`;

const isValidBuildManifest = (manifest) => {
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    !/^sha256:[a-f0-9]{64}$/.test(manifest.buildId || "") ||
    !Number.isSafeInteger(manifest.totalSize) ||
    manifest.totalSize < 0 ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== 4
  ) {
    return false;
  }

  const roles = new Set();
  for (const file of manifest.files) {
    if (
      !file ||
      !["loader", "data", "framework", "wasm"].includes(file.role) ||
      roles.has(file.role) ||
      typeof file.url !== "string" ||
      !/^Build\/[^/]+$/.test(file.url) ||
      file.url.includes("..") ||
      !Number.isSafeInteger(file.size) ||
      file.size <= 0 ||
      !/^[a-f0-9]{64}$/.test(file.sha256 || "") ||
      !(
        file.responseSha256 === null ||
        /^[a-f0-9]{64}$/.test(file.responseSha256 || "")
      ) ||
      !(
        file.responseSize === null ||
        (Number.isSafeInteger(file.responseSize) && file.responseSize > 0)
      ) ||
      !["identity", "gzip", "br"].includes(file.contentEncoding) ||
      typeof file.contentType !== "string" ||
      !file.contentType
    ) {
      return false;
    }
    roles.add(file.role);
  }
  return roles.size === 4;
};

const manifestRequest = () =>
  new Request(scopeUrl(BUILD_MANIFEST_PATH), {
    cache: "no-store",
    credentials: "same-origin",
  });

const parseBuildManifestResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`Build manifest request failed (${response.status})`);
  }
  const manifest = await response.json();
  if (!isValidBuildManifest(manifest)) {
    throw new Error("Build manifest is malformed");
  }
  return manifest;
};

const readCachedBuildManifest = async () => {
  const cache = await caches.open(BUILD_META_CACHE_NAME);
  const response = await cache.match(manifestRequest());
  if (!response) throw new Error("No verified build manifest is cached");
  return parseBuildManifestResponse(response);
};

const storeBuildManifest = async (manifest) => {
  const cache = await caches.open(BUILD_META_CACHE_NAME);
  await cache.put(
    manifestRequest(),
    new Response(JSON.stringify(manifest), {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    })
  );
};

const fetchBuildManifest = async () => {
  let response;
  try {
    response = await fetch(manifestRequest());
  } catch (networkError) {
    return readCachedBuildManifest().catch(() => {
      throw networkError;
    });
  }

  if (!response.ok) {
    return readCachedBuildManifest().catch(() =>
      parseBuildManifestResponse(response)
    );
  }

  const manifest = await parseBuildManifestResponse(response);
  await storeBuildManifest(manifest).catch((error) => {
    console.warn("[WebPreview] Build manifest offline fallback unavailable.", error);
  });
  return manifest;
};

const getBuildManifest = ({ force = false } = {}) => {
  if (force || !manifestPromise) {
    manifestPromise = fetchBuildManifest().catch((error) => {
      manifestPromise = null;
      throw error;
    });
  }
  return manifestPromise;
};

const findManifestFile = (manifest, requestUrl) => {
  const url = new URL(requestUrl);
  return (
    manifest.files.find(
      (file) => scopeUrl(file.url).pathname === url.pathname
    ) || null
  );
};

const buildCacheKeyForRevision = (requestOrUrl, buildId) => {
  const url = new URL(
    typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url
  );
  url.searchParams.set(BUILD_REVISION_QUERY, buildId);
  url.searchParams.delete(BUILD_CACHE_READY_QUERY);
  return new Request(url.toString(), {
    credentials: "same-origin",
  });
};

const buildCacheKey = (requestOrUrl, manifest) =>
  buildCacheKeyForRevision(requestOrUrl, manifest.buildId);

const buildCacheReadyKey = (manifest, file) => {
  const url = scopeUrl(BUILD_CACHE_READY_PATH);
  url.searchParams.set("v", manifest.buildId);
  url.searchParams.set("role", file.role);
  return new Request(url.toString(), { credentials: "same-origin" });
};

const buildFitsCacheBudget = (manifest) =>
  manifest.files.length <= BUILD_CACHE_MAX_ENTRIES &&
  manifest.totalSize <= BUILD_CACHE_MAX_BYTES;

// Very large Unity responses must not be tied to the Service Worker lifetime.
// Keep verification caching for bounded artifacts and stream larger artifacts
// through the browser network stack.
const isCacheVerifiableBuildFile = (file) =>
  Boolean(
    file &&
      file.size <= BUILD_CACHE_MAX_ENTRY_BYTES &&
      /^[a-f0-9]{64}$/.test(file.responseSha256 || "")
  );

const isPageVerifiableLargeBuildFile = (file) =>
  Boolean(
    file &&
      file.size > BUILD_CACHE_MAX_ENTRY_BYTES &&
      /^[a-f0-9]{64}$/.test(file.responseSha256 || "") &&
      Number.isSafeInteger(file.responseSize) &&
      file.responseSize > 0
  );

const buildFileRequest = (manifest, file) => {
  const url = scopeUrl(file.url);
  url.searchParams.set("v", manifest.buildId);
  return new Request(url.toString(), { credentials: "same-origin" });
};

const hasVerifiedLargeBuildFile = async (cache, manifest, file) => {
  if (!isPageVerifiableLargeBuildFile(file)) return false;
  const marker = await cache.match(buildCacheReadyKey(manifest, file));
  const response = await cache.match(
    buildCacheKey(buildFileRequest(manifest, file), manifest)
  );
  if (!marker || !response) return false;
  try {
    const metadata = await marker.json();
    return Boolean(
      metadata &&
        metadata.buildId === manifest.buildId &&
        metadata.role === file.role &&
        metadata.responseSha256 === file.responseSha256 &&
        metadata.responseSize === file.responseSize
    );
  } catch {
    return false;
  }
};

const isDirectStreamBuildRequest = (requestUrl) => {
  const pathname = new URL(requestUrl).pathname;
  return scopeUrl("Build/public.data.gz").pathname === pathname;
};

const isOwnedBuildCache = (name) =>
  name !== BUILD_META_CACHE_NAME &&
  (name.startsWith(BUILD_CACHE_PREFIX) ||
    (name.startsWith(OWNED_CACHE_PREFIX) &&
      !name.includes("scene") &&
      !name.includes("meta")));

const pruneOldBuildCaches = async (manifest) => {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (clients.some((client) => client.url.startsWith(self.registration.scope))) return;
  const currentBuildCache = buildCacheName(manifest);
  const cacheNames = await caches.keys();
  const oldBuildCaches = cacheNames.filter(
    (name) => isOwnedBuildCache(name) && name !== currentBuildCache
  );
  const retained = new Set(
    oldBuildCaches.slice(-RETAINED_OLD_BUILD_CACHES)
  );
  await Promise.all(
    oldBuildCaches
      .filter((name) => !retained.has(name))
      .map((name) => caches.delete(name))
  );
};

const postStatus = async (clientId, type, payload) => {
  if (!clientId) return;
  const client = await self.clients.get(clientId).catch(() => null);
  if (!client) return;
  client.postMessage({ type, ...payload });
};

const postBuildCacheStatus = (clientId, manifest, payload) =>
  postStatus(clientId, "webgl-preview-cache-status", {
    version: manifest ? manifest.buildId : "unknown",
    buildId: manifest ? manifest.buildId : "",
    ...payload,
  });

const postSceneCacheStatus = (clientId, payload) =>
  postStatus(clientId, "webgl-preview-scene-cache-status", payload);

const createTimedSignal = (signal, timeoutMs = WARM_FILE_TIMEOUT_MS) => {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(signal && signal.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", abortFromParent, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      if (signal) signal.removeEventListener("abort", abortFromParent);
    },
  };
};

const warmBuildFile = async (cache, manifest, file, signal) => {
  const url = scopeUrl(file.url);
  url.searchParams.set("v", manifest.buildId);
  const request = new Request(url.toString(), {
    cache: "reload",
    credentials: "same-origin",
  });
  const key = buildCacheKey(request, manifest);
  if (await cache.match(key)) return true;

  const timed = createTimedSignal(signal);
  try {
    const acquisition = buildArtifactCoordinator.warm({
      cache,
      key,
      request,
      file,
      signal: timed.signal,
    });
    return await acquisition.completion;
  } finally {
    timed.cleanup();
  }
};

const warmPreviewCache = async (clientId) => {
  if (warmAbortController) warmAbortController.abort();
  const controller = new AbortController();
  warmAbortController = controller;

  let manifest;
  try {
    // Force-refresh on every page startup. sw.js can be byte-identical between
    // Unity builds, so retaining an in-memory old manifest would mix revisions.
    manifest = await getBuildManifest({ force: true });
  } catch (error) {
    await postBuildCacheStatus(clientId, null, {
      status: "error",
      background: true,
      completed: 0,
      total: 0,
      path: "",
      message: error && error.message ? error.message : String(error),
    });
    return;
  }

  const total = manifest.files.length;
  const cacheableFiles = manifest.files.filter(isCacheVerifiableBuildFile);
  await postBuildCacheStatus(clientId, manifest, {
    status: "background-started",
    completed: 0,
    total,
    path: "",
    background: true,
  });

  if (!buildFitsCacheBudget(manifest)) {
    await postBuildCacheStatus(clientId, manifest, {
      status: "incomplete",
      background: true,
      completed: 0,
      total,
      path: "",
      message: "Unity build exceeds the configured cache budget",
    });
    return;
  }

  try {
    const cache = await caches.open(buildCacheName(manifest));
    const verifiedLargeFiles = [];
    const streamedFiles = [];
    for (const file of manifest.files.filter(
      (candidate) => !isCacheVerifiableBuildFile(candidate)
    )) {
      if (await hasVerifiedLargeBuildFile(cache, manifest, file)) {
        verifiedLargeFiles.push(file);
      } else {
        streamedFiles.push(file);
      }
    }
    const failedFiles = [];
    for (let index = 0; index < cacheableFiles.length; index += 1) {
      const file = cacheableFiles[index];
      const cached = await warmBuildFile(
        cache,
        manifest,
        file,
        controller.signal
      );
      if (!cached) failedFiles.push(file.url);
      await postBuildCacheStatus(clientId, manifest, {
        status: "background-progress",
        background: true,
        completed: index + 1,
        total,
        path: file.url,
        cached,
      });
    }

    if (failedFiles.length > 0 || streamedFiles.length > 0) {
      await postBuildCacheStatus(clientId, manifest, {
        status: "incomplete",
        background: true,
        completed:
          cacheableFiles.length - failedFiles.length + verifiedLargeFiles.length,
        total,
        path: "",
        failedFiles,
        streamedFiles: streamedFiles.map((file) => file.url),
        message: streamedFiles.length
          ? "Non-verifiable Unity artifacts use direct streaming"
          : "One or more Unity artifacts were not cached",
      });
      return;
    }

    // Old revisions remain a rollback option until every current artifact is
    // durably present. Only then keep the two newest old build caches.
    await pruneOldBuildCaches(manifest);
    await postBuildCacheStatus(clientId, manifest, {
      status: "complete",
      background: true,
      completed: total,
      total,
      path: "",
    });
  } catch (error) {
    await postBuildCacheStatus(clientId, manifest, {
      status: controller.signal.aborted
        ? "cancelled"
        : "error",
      background: true,
      completed: 0,
      total,
      path: "",
      code: error && error.code ? error.code : "WGP-CACHE",
      message: error && error.message ? error.message : String(error),
    });
  } finally {
    if (warmAbortController === controller) warmAbortController = null;
  }
};

const normalizeSceneResourceTargetUrl = (value) => {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !ALLOWED_SCENE_RESOURCE_HOSTS.has(url.hostname) ||
      !SCENE_RESOURCE_PATH_RE.test(url.pathname)
    ) {
      return "";
    }
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
};

const sceneEndpointUrl = () => scopeUrl(SCENE_RESOURCE_ENDPOINT);

const legacySceneEndpointUrl = () => scopeUrl(LEGACY_SCENE_RESOURCE_ENDPOINT);

const sceneResourceCacheKey = (targetUrl) => {
  const url = sceneEndpointUrl();
  url.searchParams.set("url", targetUrl);
  return new Request(url.toString(), { credentials: "same-origin" });
};

const targetFromSceneRequest = (request, endpointUrl = sceneEndpointUrl()) => {
  try {
    const requestUrl = new URL(request.url);
    if (
      requestUrl.origin !== self.location.origin ||
      requestUrl.pathname !== endpointUrl.pathname
    ) {
      return "";
    }
    return normalizeSceneResourceTargetUrl(requestUrl.searchParams.get("url"));
  } catch {
    return "";
  }
};

const isAllowedSceneResourceRequestContext = (request) =>
  request.mode !== "navigate" &&
  ALLOWED_SCENE_RESOURCE_DESTINATIONS.has(request.destination || "");

const blockedSceneResourceContextResponse = () =>
  new Response("Scene resource request context is not allowed", {
    status: 403,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });

const invalidSceneResourceUrlResponse = () =>
  new Response("Invalid scene resource URL", {
    status: 400,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });

// Both the current endpoint and Unity's historical alias pass through this
// single request-context boundary before a target URL is considered.
const handleSceneResourceEndpointRequest = (event, endpointUrl) => {
  if (!isAllowedSceneResourceRequestContext(event.request)) {
    return Promise.resolve(blockedSceneResourceContextResponse());
  }
  const targetUrl = targetFromSceneRequest(event.request, endpointUrl);
  return targetUrl
    ? handleSceneResourceRequest(event, targetUrl)
    : Promise.resolve(invalidSceneResourceUrlResponse());
};

const cachedAt = (response) =>
  Number(response && response.headers.get("x-xrugc-cached-at")) || 0;

const cachedSize = (response) =>
  Number(response && response.headers.get("x-xrugc-cache-size")) || 0;

const matchFreshSceneResource = async (cache, targetUrl) => {
  const key = sceneResourceCacheKey(targetUrl);
  const response = await cache.match(key);
  if (!response) return null;
  if (Date.now() - cachedAt(response) <= SCENE_CACHE_TTL_MS) {
    return response;
  }
  await cache.delete(key);
  return null;
};

const pruneSceneCache = async (cache) => {
  const keys = await cache.keys();
  const entries = await Promise.all(
    keys.map(async (key) => {
      const response = await cache.match(key);
      return {
        key,
        cachedAt: cachedAt(response),
        size: cachedSize(response),
      };
    })
  );
  entries.sort((left, right) => left.cachedAt - right.cachedAt);

  let totalBytes = entries.reduce((total, entry) => total + entry.size, 0);
  let totalEntries = entries.length;
  for (const entry of entries) {
    if (
      totalEntries <= SCENE_CACHE_MAX_ENTRIES &&
      totalBytes <= SCENE_CACHE_MAX_BYTES
    ) {
      break;
    }
    if (await cache.delete(entry.key)) {
      totalEntries -= 1;
      totalBytes -= entry.size;
    }
  }
};

const sceneResponseSize = (response) => {
  const value = Number(response.headers.get("content-length"));
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
};

const isSceneResponseCacheCandidate = (response) => {
  if (!response || !response.ok || response.status !== 200) return false;
  const size = sceneResponseSize(response);
  return size > 0 && size <= SCENE_CACHE_MAX_ENTRY_BYTES;
};

const cacheSceneResponse = async (cache, targetUrl, response) => {
  if (!isSceneResponseCacheCandidate(response)) return false;
  const size = sceneResponseSize(response);

  const headers = new Headers(response.headers);
  headers.set("x-xrugc-cached-at", String(Date.now()));
  headers.set("x-xrugc-cache-size", String(size));
  const cacheResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(sceneResourceCacheKey(targetUrl), cacheResponse);
  await pruneSceneCache(cache);
  return true;
};

const fetchSceneTarget = (request, targetUrl) => {
  const headers = new Headers();
  const mode = request.mode === "no-cors" ? "no-cors" : "cors";
  for (const name of ["range", "if-none-match", "if-modified-since"]) {
    if (mode === "no-cors" && name !== "range") continue;
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return fetch(targetUrl, {
    method: "GET",
    headers,
    mode,
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal: request.signal,
  });
};

const responseForSceneClient = (response) => {
  if (response.type === "opaque") return response;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

const handleSceneResourceRequest = async (event, targetUrl) => {
  const request = event.request;

  // Never materialize a complete cached body in memory to manufacture a Range
  // response. A Range request and every oversized/unknown-size response goes
  // directly upstream and is not written to Cache Storage.
  if (request.headers.has("range") || request.mode === "no-cors") {
    return responseForSceneClient(await fetchSceneTarget(request, targetUrl));
  }

  let cache = null;
  try {
    cache = await caches.open(SCENE_CACHE_NAME);
    const cached = await matchFreshSceneResource(cache, targetUrl);
    if (cached) return cached;
  } catch (error) {
    console.warn("[WebPreview] Scene cache unavailable; using network.", error);
  }

  const upstream = await fetchSceneTarget(request, targetUrl);
  if (cache && isSceneResponseCacheCandidate(upstream)) {
    const candidate = upstream.clone();
    event.waitUntil(
      cacheSceneResponse(cache, targetUrl, candidate).catch((error) => {
        console.warn("[WebPreview] Scene cache write skipped.", error);
      })
    );
  }
  return responseForSceneClient(upstream);
};

const warmSceneResourceCache = async (clientId, resources) => {
  const targets = [
    ...new Set(
      (Array.isArray(resources) ? resources : [])
        .map(normalizeSceneResourceTargetUrl)
        .filter(Boolean)
    ),
  ].slice(0, SCENE_CACHE_MAX_ENTRIES);
  if (!targets.length) return;

  const cache = await caches.open(SCENE_CACHE_NAME);
  await postSceneCacheStatus(clientId, {
    status: "started",
    completed: 0,
    total: targets.length,
  });

  let completed = 0;
  for (const targetUrl of targets) {
    const cached = await matchFreshSceneResource(cache, targetUrl);
    if (!cached) {
      try {
        const request = new Request(sceneEndpointUrl(), {
          credentials: "same-origin",
        });
        const response = await fetchSceneTarget(request, targetUrl);
        if (isSceneResponseCacheCandidate(response)) {
          await cacheSceneResponse(cache, targetUrl, response);
        } else if (response.body) {
          await response.body.cancel();
        }
      } catch {
        // Cache warming is optional; the real request remains network-first.
      }
    }
    completed += 1;
    await postSceneCacheStatus(clientId, {
      status: "progress",
      completed,
      total: targets.length,
    });
  }

  await postSceneCacheStatus(clientId, {
    status: "complete",
    completed,
    total: targets.length,
  });
};

const retainedBuildResponse = async (request, buildId) => {
  const cacheName = buildCacheNameForId(buildId);
  if (!(await caches.keys()).includes(cacheName)) return null;
  const cache = await caches.open(cacheName);
  return (
    (await cache.match(buildCacheKeyForRevision(request, buildId))) || null
  );
};

const unavailableBuildRevisionResponse = (buildId) =>
  new Response(
    `WGP-CACHE-REVISION: verified Unity build ${buildId || "unknown"} is unavailable`,
    {
      status: 409,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      },
    }
  );

const unavailableVerifiedCacheResponse = () =>
  new Response("WGP-CACHE-MISS: verified Unity data cache is unavailable", {
    status: 409,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });

const handleBuildRequest = async (
  event,
  { cacheOnly = false, allowLarge = false } = {}
) => {
  const request = event.request;
  let manifest;
  try {
    manifest = await getBuildManifest();
  } catch {
    return fetch(request);
  }

  const requestUrl = new URL(request.url);
  const requestedRevision = requestUrl.searchParams.get("v");
  if (requestedRevision && !/^sha256:[a-f0-9]{64}$/.test(requestedRevision)) {
    return unavailableBuildRevisionResponse(requestedRevision);
  }
  if (requestedRevision && requestedRevision !== manifest.buildId) {
    try {
      const refreshed = await getBuildManifest({ force: true });
      if (requestedRevision === refreshed.buildId) manifest = refreshed;
    } catch {
      // Offline reload may still use a fully verified retained build below.
    }
  }
  if (requestedRevision && requestedRevision !== manifest.buildId) {
    const retained = await retainedBuildResponse(request, requestedRevision);
    return retained || unavailableBuildRevisionResponse(requestedRevision);
  }

  const file = findManifestFile(manifest, request.url);
  if (
    !file ||
    !buildFitsCacheBudget(manifest) ||
    (!isCacheVerifiableBuildFile(file) &&
      !(allowLarge && isPageVerifiableLargeBuildFile(file))) ||
    request.headers.has("range")
  ) {
    return fetch(request);
  }

  try {
    const cache = await caches.open(buildCacheName(manifest));
    const key = buildCacheKey(request, manifest);
    const cached = await cache.match(key);
    if (
      cached &&
      (!cacheOnly || (await hasVerifiedLargeBuildFile(cache, manifest, file)))
    ) {
      return cached;
    }
    if (cacheOnly) return unavailableVerifiedCacheResponse();

    const acquisition = buildArtifactCoordinator.foreground({
      cache,
      key,
      request,
      file,
      signal: request.signal,
    });
    event.waitUntil(
      acquisition.completion.catch(async (error) => {
        const code = error && error.code ? error.code : "WGP-CACHE";
        console.warn(`[WebPreview] ${code}: build cache write skipped.`, error);
        await postBuildCacheStatus(event.clientId, manifest, {
          status: "error",
          background: true,
          completed: 0,
          total: manifest.files.length,
          path: file.url,
          code,
          message: error && error.message ? error.message : String(error),
        });
      })
    );
    return await acquisition.response;
  } catch (error) {
    console.warn("[WebPreview] Build cache unavailable; using network.", error);
    return fetch(request);
  }
};

self.addEventListener("install", (event) => {
  // Installation deliberately does not download the ~200 MB Unity build.
  // Do not call skipWaiting: even accidental in-place changes must wait until
  // the release has no active clients. New versions have a new scope.
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  // Activation never removes a known-good rollback revision. Pruning is gated
  // by a successful four-file warm of the current build.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  // Only controlled release clients may initiate cache work or cancellation.
  if (!event.source || !event.source.url || !event.source.url.startsWith(self.registration.scope)) return;
  if (event.data && event.data.type === "warm-webgl-preview-cache") {
    event.waitUntil(warmPreviewCache(event.source && event.source.id));
  }
  if (event.data && event.data.type === "warm-webgl-scene-resource-cache") {
    event.waitUntil(
      warmSceneResourceCache(
        event.source && event.source.id,
        event.data.resources || []
      )
    );
  }
  if (event.data && event.data.type === "cancel-webgl-preview-cache") {
    if (warmAbortController) warmAbortController.abort();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    const targetUrl = normalizeSceneResourceTargetUrl(event.request.url);
    if (targetUrl && isAllowedSceneResourceRequestContext(event.request)) {
      event.respondWith(handleSceneResourceRequest(event, targetUrl));
    }
    return;
  }

  // Some pinned Unity resource handlers emit an absolute historical alias.
  // This is still intercepted only for this worker's controlled release
  // iframe; no worker is registered for the main site's root.
  const absoluteLegacyEndpoint = new URL("/__xrugc_proxy__", self.location.origin);
  if (url.pathname === absoluteLegacyEndpoint.pathname) {
    event.respondWith(handleSceneResourceEndpointRequest(event, absoluteLegacyEndpoint));
    return;
  }

  // A controlled iframe can fetch outside its scope, but this worker never
  // intercepts the main site, authentication routes or business APIs.
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  // Do not call respondWith for the large Unity data artifact. This
  // gives the browser's native network loader full ownership of the stream and
  // prevents a slow download from being terminated with the Service Worker.
  if (isDirectStreamBuildRequest(event.request.url)) {
    if (
      !event.request.headers.has("range") &&
      url.searchParams.get(BUILD_CACHE_READY_QUERY) === "1"
    ) {
      event.respondWith(
        handleBuildRequest(event, { cacheOnly: true, allowLarge: true })
      );
    }
    return;
  }

  // Authenticated Platform API responses are always network-only. Do not load
  // the Build Manifest and do not make them eligible for any Cache Storage
  // path, even when the Service Worker controls a subpath deployment.
  const platformApiAlias = scopeUrl(`${PLATFORM_API_ALIAS_SEGMENT}/`);
  if (
    url.pathname === platformApiAlias.pathname.slice(0, -1) ||
    url.pathname.startsWith(platformApiAlias.pathname)
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname === sceneEndpointUrl().pathname) {
    event.respondWith(
      handleSceneResourceEndpointRequest(event, sceneEndpointUrl())
    );
    return;
  }

  if (url.pathname === legacySceneEndpointUrl().pathname) {
    event.respondWith(
      handleSceneResourceEndpointRequest(event, legacySceneEndpointUrl())
    );
    return;
  }

  event.respondWith(
    getBuildManifest()
      .then((manifest) =>
        findManifestFile(manifest, event.request.url)
          ? handleBuildRequest(event)
          : fetch(event.request)
      )
      .catch(() => fetch(event.request))
  );
});
