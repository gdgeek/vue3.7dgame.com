const PRODUCTION_ORIGIN = "https://d.xrugc.com";
const RUNNER_PATH = "/internal/task51/memory-isolated-runner";
const RUNNER_LANGUAGES = new Set(["zh-CN", "en-US", "ja-JP", "th-TH", "zh-TW"]);
const RUNNER_THEMES = new Set([
  "modern-blue",
  "deep-space",
  "cyber-tech",
  "edu-friendly",
  "neo-brutalism",
  "minimal-pure",
]);
const API_ORIGINS = Object.freeze([
  "https://api.xrteeth.com",
  "https://api.tmrpp.com",
]);
const LOGIN_PATH = "/v1/auth/login";
const LOGOUT_PATH = "/v1/auth/logout";
const EVIDENCE_PATHS = Object.freeze([
  "/v1/user/info",
  "/v1/plugin/verify-token",
  "/v1/organization/list",
]);
const ROLES = Object.freeze(["user", "manager", "admin", "root"]);
const NODES = Object.freeze(["xrteeth", "tmrpp"]);
const ORIGIN_BY_NODE = Object.freeze({
  xrteeth: API_ORIGINS[0],
  tmrpp: API_ORIGINS[1],
});
const LOGIN_ORIGIN_BY_ROLE = Object.freeze({
  user: API_ORIGINS[0],
  manager: API_ORIGINS[0],
  admin: API_ORIGINS[1],
  root: API_ORIGINS[1],
});
const SAFE_DESCRIPTOR_KEYS = Object.freeze([
  "corsRequestHeaderNames",
  "corsRequestMethod",
  "id",
  "method",
  "redirected",
  "resourceType",
  "url",
]);
const SAFE_RESOURCE_TYPES = new Set(["fetch"]);

export const TASK51_BOOTSTRAP_READ_ALLOWLIST = Object.freeze([
  "https://api.xrteeth.com/v1/user/info",
  "https://api.xrteeth.com/v1/plugin/verify-token",
]);
export const TASK51_AUTHENTICATED_READ_CORS_NAMES =
  "authorization,content-type";

export const TASK51_NETWORK_RECEIPT_SCHEMA =
  "wp3-task51-safe-network-receipt-v2";
export const TASK51_EXPECTED_BUSINESS_REQUEST_COUNT = 64;

const TERMINAL_METADATA_KEYS = Object.freeze([
  "byteLength",
  "contentSha256",
  "httpStatus",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const TASK51_PUBLIC_STARTUP_REQUEST_SHA256 =
  "2a3cc5feae3acc0c7cbea84bef1702c2e292ecbe1e6de6a1d40f00b6c88fdc51";
export const TASK51_CURRENT_STABLE_ENTRY_REQUEST_SHA256 =
  "017f9c6f2166710a1739b060cf4639e049a8102e6564be3ce44a365c3d687d1d";
export const TASK51_CURRENT_STABLE_ENTRY_URL = "https://xrugc.com/?lang=zh-CN";
export const TASK51_CURRENT_STABLE_ENTRY_RESPONSE = Object.freeze({
  url: TASK51_CURRENT_STABLE_ENTRY_URL,
  contentSha256:
    "d75a4f87fa6b833e735df43c0ffba202b47a391e2eefcc71c813067ef0d6dea2",
  byteLength: 1237,
});
export const TASK51_STABLE_ENTRY_COLD_PUBLIC_READ_URLS = Object.freeze([
  "https://d.xrugc.com/api/v1/system/deployment",
  "https://d.xrugc.com/api-doc?categories=74&per_page=5&page=1&_fields=id,title,sort,excerpt,jetpack_featured_media_url,date&rest_route=%2Fwp%2Fv2%2Fposts",
]);

export function assertTask51CurrentStableEntry(entry) {
  if (
    !exactKeys(entry, [
      "schema",
      "approvalRequestSha256",
      "ownerDecision",
      "url",
    ]) ||
    entry.schema !== "wp3-task51-current-stable-public-login-entry-v1" ||
    entry.approvalRequestSha256 !==
      TASK51_CURRENT_STABLE_ENTRY_REQUEST_SHA256 ||
    entry.url !== TASK51_CURRENT_STABLE_ENTRY_URL ||
    !exactKeys(entry.ownerDecision, ["evidenceRef", "evidenceSha256"]) ||
    !/^reports\/[A-Za-z0-9._/-]+\.json$/.test(
      entry.ownerDecision.evidenceRef
    ) ||
    entry.ownerDecision.evidenceRef.split("/").includes("..") ||
    !SHA256_PATTERN.test(entry.ownerDecision.evidenceSha256)
  )
    throw new Error("TASK51_CURRENT_STABLE_ENTRY_REJECTED");
  return true;
}
export const TASK51_OPTIONAL_PUBLIC_READ_URLS = Object.freeze([
  "https://d.xrugc.com/api-config/api/v1/plugin/list",
  "https://d.xrugc.com/api-doc?per_page=100&hide_empty=false&rest_route=%2Fwp%2Fv2%2Fcategories",
  "https://d.xrugc.com/api-doc?_embed=wp%3Afeaturedmedia%2Cwp%3Aterm&per_page=10&page=1&rest_route=%2Fwp%2Fv2%2Fposts",
]);
export const TASK51_STARTUP_PUBLIC_READ_RESPONSES = Object.freeze(
  [
    [
      TASK51_OPTIONAL_PUBLIC_READ_URLS[0],
      "46a425e42146f05ba8435b4e9667b6ff13ad68ab48f416e7b7e0ace9f1a631cb",
      547,
    ],
    [
      TASK51_OPTIONAL_PUBLIC_READ_URLS[1],
      "e62b2d94ce49820e200a780bb047662bf487fb3f306517371c8480191fc3d41e",
      23948,
    ],
    [
      "https://d.xrugc.com/api/v1/system/deployment",
      "9199c4003353b10e23a88474fc456da95ba96a9dbecc0bd16c486ad3974fbb22",
      323,
    ],
    [
      TASK51_OPTIONAL_PUBLIC_READ_URLS[2],
      "c6583854dea3b2bd2b6c37e56fcb0c3382b2bdd195163c3bd158f05f0e9f0c4a",
      286728,
    ],
    [
      "https://d.xrugc.com/api-doc?categories=74&per_page=5&page=1&_fields=id,title,sort,excerpt,jetpack_featured_media_url,date&rest_route=%2Fwp%2Fv2%2Fposts",
      "8931a3da3fe2a747c2d7d8f880f88a8512c9a3425a05408e39fd3775a371ce31",
      2387,
    ],
  ].map(([url, contentSha256, byteLength]) =>
    Object.freeze({ url, contentSha256, byteLength })
  )
);
export const TASK51_PUBLIC_STARTUP_READ_IDENTITIES =
  TASK51_STARTUP_PUBLIC_READ_RESPONSES;
export const TASK51_NAVIGATION_PUBLIC_ASSETS = Object.freeze(
  [
    [
      "https://d.xrugc.com/config/domains/xingkou-logo.webp",
      "c5d2410f932571493cba78e5903ea891d1df1612464c421393a77008e3984ff3",
      3,
      ["image", "other"],
    ],
    [
      "https://d.xrugc.com/fonts/SourceHanSansCN.C0BBeL8g.ttf",
      "e7ed74bc82eddfb62bc9a09b7e850731ea40da8e8a1b530318c3fe395045ae6d",
      1,
      ["font"],
    ],
    [
      "https://d.xrugc.com/fonts/SourceHanSansSC-VF.otf.CEbNpiXI.woff2",
      "22d5bc4ff2629bd85ab3946661bc95210a755af4c359a9bbb1b464ef2698addd",
      1,
      ["font"],
    ],
    [
      "https://d.xrugc.com/media/bg/bujiaban.png",
      "0011ba8eee239e134fb5d66c7812fadcde27c92fb241d54336e93cb9482a01fb",
      1,
      ["image"],
    ],
    [
      "https://d.xrugc.com/media/bg/rokid-lite.webp",
      "2db5dba2dd422a7a73f38f6a5b85490d3f2834575b2eeb802c905a8e8c1d6f14",
      1,
      ["image"],
    ],
    [
      "https://d.xrugc.com/media/bg/rokid.webp",
      "c2cc98ed98657cfe76fd6b964b2fabef907d277ac5e58a5bd1ec8494c31fbdd5",
      1,
      ["image"],
    ],
    [
      "https://d.xrugc.com/media/bg/rokid/lite.png",
      "923f83e6b2472d17fb40bb90ee5f6dfec41fe6c681b8fcf343d0118c84292b50",
      1,
      ["image"],
    ],
    [
      "https://d.xrugc.com/media/bg/rokid/studio.png",
      "e38c74e0c8a79e56f73a8b9547569a7c1eb54d92c41dff2883dbd19b1bb08d58",
      1,
      ["image"],
    ],
    [
      "https://d.xrugc.com/media/icon/blockly_logo_only.png",
      "08d0d46bb59314dad74c1382b1c94bd0a18eb980ea08570877608e4b59ba0698",
      1,
      ["image"],
    ],
    [
      "https://d.xrugc.com/media/bg/cloudbgc5.jpg",
      "d8e01aa56976eb159200905c744c269b277c3be8f251369c9f66533f4b0f63eb",
      1,
      ["image"],
    ],
    [
      "https://hololens2.cn/wp-content/uploads/2022/04/squre.png",
      "2b1b1aabe459d3fada84421d4571433c1dd8ab5f836ed60bb045caa22464554e",
      1,
      ["image"],
    ],
  ].map(
    ([
      url,
      contentSha256,
      maximumExceptionalOutcomesPerSession,
      resourceTypes,
    ]) =>
      Object.freeze({
        url,
        contentSha256,
        maximumExceptionalOutcomesPerSession,
        resourceTypes: Object.freeze(resourceTypes),
      })
  )
);

export function assertTask51PublicStartupLifecyclePlan(
  plan,
  staticUrls = null,
  counts = null
) {
  const fail = () => {
    throw new Error("TASK51_PUBLIC_STARTUP_PLAN_REJECTED");
  };
  const binding = (value) =>
    exactKeys(value, ["evidenceRef", "evidenceSha256"]) &&
    /^reports\/[A-Za-z0-9._/-]+\.json$/.test(value.evidenceRef) &&
    !value.evidenceRef.split("/").includes("..") &&
    SHA256_PATTERN.test(value.evidenceSha256);
  if (Object.hasOwn(plan ?? {}, "stableEntry"))
    assertTask51CurrentStableEntry(plan.stableEntry);
  const stableEntry = plan?.stableEntry ?? null;
  if (
    !exactKeys(plan, [
      "schema",
      "approvalRequestSha256",
      "ownerDecision",
      "navigation",
      "optionalPublicReadUrls",
      "staticRequestBounds",
      "navigationAssets",
      ...(stableEntry ? ["stableEntry"] : []),
    ]) ||
    plan.schema !== "wp3-task51-public-startup-lifecycle-plan-v1" ||
    plan.approvalRequestSha256 !== TASK51_PUBLIC_STARTUP_REQUEST_SHA256 ||
    !binding(plan.ownerDecision) ||
    (stableEntry &&
      (stableEntry.ownerDecision.evidenceRef ===
        plan.ownerDecision.evidenceRef ||
        stableEntry.ownerDecision.evidenceSha256 ===
          plan.ownerDecision.evidenceSha256)) ||
    !exactKeys(plan.navigation, [
      "fromDocumentUrl",
      "toDocumentUrl",
      "maximumCount",
    ]) ||
    plan.navigation.fromDocumentUrl !== "https://d.xrugc.com/" ||
    plan.navigation.toDocumentUrl !== "https://xrugc.com/?lang=zh-CN" ||
    plan.navigation.maximumCount !== 1 ||
    JSON.stringify(plan.optionalPublicReadUrls) !==
      JSON.stringify(TASK51_OPTIONAL_PUBLIC_READ_URLS) ||
    !Array.isArray(plan.navigationAssets) ||
    plan.navigationAssets.length !== TASK51_NAVIGATION_PUBLIC_ASSETS.length ||
    plan.navigationAssets.some((asset, index) => {
      const expected = TASK51_NAVIGATION_PUBLIC_ASSETS[index];
      return (
        !exactKeys(asset, [
          "url",
          "source",
          "contentSha256",
          "maximumExceptionalOutcomesPerSession",
          "resourceTypes",
        ]) ||
        asset.url !== expected.url ||
        asset.contentSha256 !== expected.contentSha256 ||
        asset.maximumExceptionalOutcomesPerSession !==
          expected.maximumExceptionalOutcomesPerSession ||
        JSON.stringify(asset.resourceTypes) !==
          JSON.stringify(expected.resourceTypes) ||
        !binding(asset.source) ||
        asset.source.evidenceRef === plan.ownerDecision.evidenceRef ||
        asset.source.evidenceSha256 === plan.ownerDecision.evidenceSha256
      );
    }) ||
    !Array.isArray(plan.staticRequestBounds) ||
    plan.staticRequestBounds.length < 2 ||
    plan.staticRequestBounds.some(
      (entry) =>
        !exactKeys(entry, ["url", "minimumCount", "maximumCount"]) ||
        !Number.isSafeInteger(entry.minimumCount) ||
        !Number.isSafeInteger(entry.maximumCount) ||
        entry.minimumCount < 0 ||
        entry.maximumCount < Math.max(1, entry.minimumCount) ||
        entry.maximumCount > 16
    ) ||
    new Set(plan.staticRequestBounds.map((entry) => entry.url)).size !==
      plan.staticRequestBounds.length ||
    plan.staticRequestBounds.reduce(
      (sum, entry) => sum + entry.maximumCount,
      0
    ) > 2048 ||
    plan.staticRequestBounds.find(
      (entry) => entry.url === plan.navigation.fromDocumentUrl
    )?.minimumCount !== (stableEntry ? 0 : 1) ||
    plan.staticRequestBounds.find(
      (entry) => entry.url === plan.navigation.toDocumentUrl
    )?.minimumCount !== 1 ||
    plan.staticRequestBounds.find(
      (entry) => entry.url === "https://d.xrugc.com/js/index.DmVWUsa-.js"
    )?.minimumCount !== 1 ||
    plan.staticRequestBounds.some(
      (entry) =>
        new URL(entry.url).pathname ===
          "/internal/task51/memory-isolated-runner" && entry.minimumCount !== 1
    ) ||
    (staticUrls !== null &&
      (plan.staticRequestBounds.length !== staticUrls.length ||
        plan.staticRequestBounds.some(
          (entry, index) => entry.url !== staticUrls[index]
        ))) ||
    (counts !== null &&
      plan.staticRequestBounds.some(
        (entry, index) => entry.maximumCount !== counts[index]?.count
      ))
  )
    fail();
  return true;
}

const NAVIGATION_PROOF_KEYS = Object.freeze([
  "sequence",
  "url",
  "resourceType",
  "frameId",
  "loaderId",
  "requestId",
  "requestObservedAt",
  "terminalObservedAt",
  "bodyFailureObservedAt",
  "terminal",
  "httpStatus",
  "byteLength",
  "contentSha256",
  "nativeBodyObserved",
  "nativeEvent",
  "nativeErrorText",
  "canceled",
  "bodyReadFailure",
]);
const nativeId = (value) =>
  typeof value === "string" && /^[A-Za-z0-9._:-]{1,160}$/.test(value);
const time = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value));
export function assertTask51PublicStartupLifecycleReceipt(
  receipt,
  plan = null
) {
  if (plan !== null) assertTask51PublicStartupLifecyclePlan(plan);
  const assets = plan?.navigationAssets ?? TASK51_NAVIGATION_PUBLIC_ASSETS;
  if (
    !exactKeys(receipt, [
      "schema",
      "navigation",
      "exceptionalTerminals",
      "publicReadTerminals",
      "staticTerminalCounts",
      "phaseBoundaries",
      "firstAuthenticationRequest",
    ]) ||
    receipt.schema !== "wp3-task51-public-startup-lifecycle-receipt-v1" ||
    !Array.isArray(receipt.exceptionalTerminals) ||
    !Array.isArray(receipt.publicReadTerminals) ||
    !exactKeys(receipt.phaseBoundaries, [
      "authenticationStartedAt",
      "quietStartedAt",
      "strictStartedAt",
    ]) ||
    Object.values(receipt.phaseBoundaries).some(
      (value) => value !== null && !time(value)
    ) ||
    !exactKeys(receipt.staticTerminalCounts, [
      "successfulStatic",
      "navigationCancelled",
      "navigationBodyUnavailable",
    ]) ||
    Object.values(receipt.staticTerminalCounts).some(
      (value) => !Number.isSafeInteger(value) || value < 0
    ) ||
    receipt.staticTerminalCounts.navigationCancelled !==
      receipt.exceptionalTerminals.filter(
        (entry) => entry.terminal === "navigation-cancelled"
      ).length ||
    receipt.staticTerminalCounts.navigationBodyUnavailable !==
      receipt.exceptionalTerminals.filter(
        (entry) => entry.terminal === "navigation-body-unavailable"
      ).length
  )
    throw new Error("TASK51_PUBLIC_STARTUP_RECEIPT_REJECTED");
  const publicReads = new Set();
  for (const read of receipt.publicReadTerminals) {
    const expected = TASK51_STARTUP_PUBLIC_READ_RESPONSES.find(
      (entry) => entry.url === read?.url
    );
    if (
      !expected ||
      !exactKeys(read, ["url", "httpStatus", "byteLength", "contentSha256"]) ||
      publicReads.has(read.url) ||
      read.httpStatus !== 200 ||
      read.byteLength !== expected.byteLength ||
      read.contentSha256 !== expected.contentSha256
    )
      throw new Error("TASK51_PUBLIC_STARTUP_PUBLIC_READ_REJECTED");
    publicReads.add(read.url);
  }
  const nav = receipt.navigation;
  const firstAuth = receipt.firstAuthenticationRequest;
  if (
    firstAuth !== null &&
    (!exactKeys(firstAuth, [
      "requestId",
      "frameId",
      "loaderId",
      "url",
      "method",
      "resourceType",
      "requestObservedAt",
    ]) ||
      ![firstAuth.requestId, firstAuth.frameId, firstAuth.loaderId].every(
        nativeId
      ) ||
      !["OPTIONS", "POST", "GET"].includes(firstAuth.method) ||
      !["fetch", "xhr", "other", "preflight"].includes(
        firstAuth.resourceType
      ) ||
      (firstAuth.resourceType === "preflight" &&
        firstAuth.method !== "OPTIONS") ||
      !time(firstAuth.requestObservedAt) ||
      !/^https:\/\/[A-Za-z0-9.-]+\/(?:[A-Za-z0-9._/-]*\/)?(?:v1\/auth\/(?:login|refresh)|authorize|token)$/.test(
        firstAuth.url
      ) ||
      (firstAuth.method === "GET" && !firstAuth.url.endsWith("/authorize")))
  )
    throw new Error("TASK51_PUBLIC_STARTUP_AUTH_BOUNDARY_REJECTED");
  if (
    nav !== null &&
    (!exactKeys(nav, [
      "frameId",
      "fromLoaderId",
      "toLoaderId",
      "fromDocumentUrl",
      "toDocumentUrl",
      "requestedAt",
      "committedAt",
    ]) ||
      ![nav.frameId, nav.fromLoaderId, nav.toLoaderId].every(nativeId) ||
      nav.fromLoaderId === nav.toLoaderId ||
      nav.fromDocumentUrl !== "https://d.xrugc.com/" ||
      nav.toDocumentUrl !== "https://xrugc.com/?lang=zh-CN" ||
      !time(nav.requestedAt) ||
      !time(nav.committedAt) ||
      Date.parse(nav.requestedAt) > Date.parse(nav.committedAt))
  )
    throw new Error("TASK51_PUBLIC_STARTUP_NAVIGATION_REJECTED");
  const boundaries = Object.values(receipt.phaseBoundaries)
    .filter((value) => value !== null)
    .map((value) => Date.parse(value));
  const { authenticationStartedAt, quietStartedAt, strictStartedAt } =
    receipt.phaseBoundaries;
  if (
    (firstAuth === null) !== (authenticationStartedAt === null) ||
    (firstAuth !== null &&
      firstAuth.requestObservedAt !== authenticationStartedAt)
  )
    throw new Error("TASK51_PUBLIC_STARTUP_AUTH_BOUNDARY_REJECTED");
  if (
    (quietStartedAt !== null && authenticationStartedAt === null) ||
    (strictStartedAt !== null && quietStartedAt === null) ||
    (authenticationStartedAt !== null &&
      quietStartedAt !== null &&
      Date.parse(authenticationStartedAt) > Date.parse(quietStartedAt)) ||
    (quietStartedAt !== null &&
      strictStartedAt !== null &&
      Date.parse(quietStartedAt) > Date.parse(strictStartedAt)) ||
    (nav !== null &&
      boundaries.some((boundary) => Date.parse(nav.committedAt) >= boundary))
  )
    throw new Error("TASK51_PUBLIC_STARTUP_PHASE_REJECTED");
  const seen = new Set(),
    sequences = new Set(),
    counters = new Map();
  for (const proof of receipt.exceptionalTerminals) {
    const asset = assets.find((entry) => entry.url === proof?.url);
    const key = `${proof?.loaderId}:${proof?.requestId}`;
    const cancelled = proof?.terminal === "navigation-cancelled";
    const unavailable = proof?.terminal === "navigation-body-unavailable";
    if (
      !nav ||
      !asset ||
      !exactKeys(proof, NAVIGATION_PROOF_KEYS) ||
      !Number.isSafeInteger(proof.sequence) ||
      proof.sequence < 1 ||
      seen.has(key) ||
      sequences.has(proof.sequence) ||
      ![proof.frameId, proof.loaderId, proof.requestId].every(nativeId) ||
      proof.frameId !== nav.frameId ||
      proof.loaderId !== nav.fromLoaderId ||
      !asset.resourceTypes.includes(proof.resourceType) ||
      !time(proof.requestObservedAt) ||
      !time(proof.terminalObservedAt) ||
      Date.parse(proof.requestObservedAt) > Date.parse(nav.requestedAt) ||
      Date.parse(proof.terminalObservedAt) <
        Date.parse(proof.requestObservedAt) ||
      boundaries.some(
        (boundary) =>
          Date.parse(proof.terminalObservedAt) >= boundary ||
          (proof.bodyFailureObservedAt !== null &&
            Date.parse(proof.bodyFailureObservedAt) >= boundary)
      ) ||
      proof.byteLength !== null ||
      proof.contentSha256 !== null ||
      proof.nativeBodyObserved !== false ||
      !(
        (cancelled &&
          proof.nativeEvent === "loadingFailed" &&
          proof.nativeErrorText === "net::ERR_ABORTED" &&
          typeof proof.canceled === "boolean" &&
          proof.httpStatus === null &&
          proof.bodyReadFailure === null &&
          proof.bodyFailureObservedAt === null &&
          Date.parse(proof.terminalObservedAt) >=
            Date.parse(nav.requestedAt)) ||
        (unavailable &&
          proof.nativeEvent === "loadingFinished" &&
          proof.nativeErrorText === null &&
          proof.canceled === null &&
          proof.httpStatus === 200 &&
          proof.bodyReadFailure === "NO_RESOURCE_WITH_GIVEN_IDENTIFIER" &&
          time(proof.bodyFailureObservedAt) &&
          Date.parse(proof.bodyFailureObservedAt) >=
            Math.max(
              Date.parse(nav.committedAt),
              Date.parse(proof.terminalObservedAt)
            ))
      ) ||
      (counters.get(asset.url) ?? 0) >=
        asset.maximumExceptionalOutcomesPerSession
    )
      throw new Error("TASK51_PUBLIC_STARTUP_TERMINAL_REJECTED");
    seen.add(key);
    sequences.add(proof.sequence);
    counters.set(asset.url, (counters.get(asset.url) ?? 0) + 1);
  }
  return true;
}

function freezeLedger(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

function appendEvidence(entries, phase, node, role, path) {
  entries.push({
    kind: "evidence-get",
    method: "GET",
    url: `${ORIGIN_BY_NODE[node]}${path}`,
    phase,
    node,
    role,
    path,
  });
}

/**
 * The order mirrors the existing memory-isolated runner: each credential is
 * logged in and revoked before the next role, then the fixed 56-cell ledger is
 * fetched serially.
 */
export function buildTask51BusinessLedger() {
  const entries = [];
  for (const role of ROLES) {
    const origin = LOGIN_ORIGIN_BY_ROLE[role];
    entries.push({
      kind: "login-post",
      method: "POST",
      url: `${origin}${LOGIN_PATH}`,
      role,
    });
    entries.push({
      kind: "logout-post",
      method: "POST",
      url: `${origin}${LOGOUT_PATH}`,
      role,
    });
  }

  for (const node of NODES) {
    for (const role of ROLES) {
      appendEvidence(entries, "readiness", node, role, EVIDENCE_PATHS[0]);
    }
  }
  for (const node of NODES) {
    for (const role of ROLES) {
      for (const path of EVIDENCE_PATHS) {
        appendEvidence(entries, "baseline", node, role, path);
      }
    }
  }
  for (const node of NODES) {
    for (const role of ROLES) {
      for (const path of EVIDENCE_PATHS) {
        appendEvidence(entries, "shadow", node, role, path);
      }
    }
  }

  if (
    entries.length !== TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
    entries.filter(({ kind }) => kind === "login-post").length !== 4 ||
    entries.filter(({ kind }) => kind === "logout-post").length !== 4 ||
    entries.filter(({ kind }) => kind === "evidence-get").length !== 56
  ) {
    throw new Error("TASK51_NETWORK_INVALID_FIXED_LEDGER");
  }
  return freezeLedger(entries);
}

export const TASK51_BUSINESS_LEDGER = buildTask51BusinessLedger();

function normalizedNetworkUrl(value) {
  const parsed = new URL(value);
  if (parsed.href !== value || parsed.hash !== "") {
    throw new Error("TASK51_NETWORK_NONCANONICAL_URL");
  }
  return parsed.href;
}

// Only page preferences written by useUrlSettings are accepted here. Network
// request URLs and the configured runner URL keep their existing exact rules.
export function isTask51RunnerPageUrl(value) {
  if (typeof value !== "string" || value.length > 512) return false;
  try {
    const parsed = new URL(value);
    if (
      parsed.origin !== PRODUCTION_ORIGIN ||
      parsed.pathname !== RUNNER_PATH ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.hash !== "" ||
      parsed.href !== value ||
      value !== `${PRODUCTION_ORIGIN}${RUNNER_PATH}${parsed.search}`
    )
      return false;
    if (parsed.search === "") return true;
    const seen = new Set();
    return parsed.search
      .slice(1)
      .split("&")
      .every((part) => {
        const [key, preference, ...extra] = part.split("=");
        if (extra.length || seen.has(key)) return false;
        seen.add(key);
        return key === "lang"
          ? RUNNER_LANGUAGES.has(preference)
          : key === "theme" && RUNNER_THEMES.has(preference);
      });
  } catch {
    return false;
  }
}

function isForbiddenSameOriginPath(pathname) {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/api-auth" ||
    pathname.startsWith("/api-auth/")
  );
}

export function validateTask51StaticAllowlist(
  runnerUrl,
  staticUrls,
  { currentSources = false } = {}
) {
  const runner = new URL(runnerUrl);
  if (
    runner.origin !== PRODUCTION_ORIGIN ||
    runner.pathname !== RUNNER_PATH ||
    runner.username !== "" ||
    runner.password !== "" ||
    runner.search !== "" ||
    runner.hash !== "" ||
    isForbiddenSameOriginPath(runner.pathname)
  ) {
    throw new Error("TASK51_NETWORK_RUNNER_URL_REJECTED");
  }

  if (
    !Array.isArray(staticUrls) ||
    staticUrls.length === 0 ||
    staticUrls.length > 512
  ) {
    throw new Error("TASK51_NETWORK_STATIC_URL_REJECTED");
  }
  const allowed = new Set();
  for (const value of staticUrls) {
    const parsed = new URL(value);
    if (
      (currentSources
        ? parsed.protocol !== "https:"
        : parsed.origin !== PRODUCTION_ORIGIN) ||
      parsed.href !== value ||
      value.length > 2048 ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      (!currentSources && parsed.search !== "") ||
      parsed.hash !== "" ||
      isForbiddenSameOriginPath(parsed.pathname) ||
      (currentSources && !validStaticQuery(parsed))
    ) {
      throw new Error("TASK51_NETWORK_STATIC_URL_REJECTED");
    }
    const normalized = normalizedNetworkUrl(value);
    if (allowed.has(normalized)) {
      throw new Error("TASK51_NETWORK_STATIC_URL_REJECTED");
    }
    allowed.add(normalized);
  }
  return allowed;
}

function validStaticQuery(parsed) {
  const seen = new Set();
  for (const [key, value] of parsed.searchParams) {
    if (
      seen.has(key) ||
      !["v", "ver", "version", "lang", "theme", "redirect"].includes(key)
    )
      return false;
    seen.add(key);
    if (key === "redirect") {
      if (
        !value.startsWith("/") ||
        value.startsWith("//") ||
        /[\\\r\n\0#]/.test(value) ||
        value.length > 512
      )
        return false;
      const nested = new URL(value, PRODUCTION_ORIGIN);
      if (nested.origin !== PRODUCTION_ORIGIN || !validStaticQuery(nested))
        return false;
    } else if (!/^[A-Za-z0-9._-]{1,128}$/.test(value)) return false;
  }
  return true;
}

export function validateTask51StaticRequestCounts(staticUrls, counts = null) {
  const values = counts ?? staticUrls.map((url) => ({ url, count: 1 }));
  if (
    !Array.isArray(values) ||
    values.length !== staticUrls.length ||
    values.some(
      (entry, index) =>
        !exactKeys(entry, ["url", "count"]) ||
        entry.url !== staticUrls[index] ||
        !Number.isSafeInteger(entry.count) ||
        entry.count < 1 ||
        entry.count > 16
    ) ||
    values.reduce((total, entry) => total + entry.count, 0) > 2048
  ) {
    throw new Error("TASK51_NETWORK_STATIC_REQUEST_COUNTS_REJECTED");
  }
  return new Map(values.map(({ url, count }) => [url, count]));
}

function exactKeys(value, expected) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function safeDescriptor(input) {
  if (!exactKeys(input, SAFE_DESCRIPTOR_KEYS)) {
    throw new Error("TASK51_NETWORK_UNSAFE_REQUEST_DESCRIPTOR");
  }
  if (
    typeof input.id !== "string" ||
    input.id.length === 0 ||
    typeof input.method !== "string" ||
    typeof input.url !== "string" ||
    typeof input.resourceType !== "string" ||
    typeof input.redirected !== "boolean" ||
    (input.corsRequestMethod !== null &&
      typeof input.corsRequestMethod !== "string") ||
    (input.corsRequestHeaderNames !== null &&
      typeof input.corsRequestHeaderNames !== "string")
  ) {
    throw new Error("TASK51_NETWORK_INVALID_REQUEST_DESCRIPTOR");
  }
  return Object.freeze({
    corsRequestHeaderNames:
      input.corsRequestHeaderNames === null
        ? null
        : input.corsRequestHeaderNames
            .split(",")
            .map((name) => name.trim().toLowerCase())
            .sort()
            .join(","),
    corsRequestMethod:
      input.corsRequestMethod === null
        ? null
        : input.corsRequestMethod.toUpperCase(),
    id: input.id,
    method: input.method.toUpperCase(),
    url: normalizedNetworkUrl(input.url),
    resourceType: input.resourceType.toLowerCase(),
    redirected: input.redirected,
  });
}

function signatureOf({ method, url }) {
  return `${method} ${url}`;
}

function expectedBusinessHttpStatus(entry) {
  return entry.kind === "evidence-get" &&
    entry.path === "/v1/organization/list" &&
    (entry.role === "user" || entry.role === "manager")
    ? 403
    : 200;
}

function safeTerminalMetadata(value, category, expected) {
  if (!exactKeys(value, TERMINAL_METADATA_KEYS)) {
    throw new Error("TASK51_NETWORK_UNSAFE_TERMINAL_METADATA");
  }
  const status = value.httpStatus;
  const contentSha256 = value.contentSha256;
  const byteLength = value.byteLength;
  if (!Number.isSafeInteger(status) || status < 100 || status > 599) {
    throw new Error("TASK51_NETWORK_UNSAFE_TERMINAL_METADATA");
  }
  if (category === "static") {
    if (
      status !== 200 ||
      !Number.isSafeInteger(byteLength) ||
      byteLength < 0 ||
      typeof contentSha256 !== "string" ||
      !SHA256_PATTERN.test(contentSha256)
    ) {
      throw new Error("TASK51_NETWORK_STATIC_RESPONSE_REJECTED");
    }
  } else {
    if (contentSha256 !== null || byteLength !== null) {
      throw new Error("TASK51_NETWORK_RESPONSE_DIGEST_REJECTED");
    }
    if (category === "options") {
      if (status !== 200 && status !== 204) {
        throw new Error("TASK51_NETWORK_OPTIONS_RESPONSE_REJECTED");
      }
    } else if (status !== expectedBusinessHttpStatus(expected)) {
      throw new Error("TASK51_NETWORK_BUSINESS_RESPONSE_REJECTED");
    }
  }
  return Object.freeze({ byteLength, contentSha256, httpStatus: status });
}

export function createTask51NetworkLedger({
  runnerUrl,
  staticUrls = [],
  currentSources = false,
  staticRequestCounts = null,
  publicStartupLifecycle = null,
  onViolation = () => {},
} = {}) {
  const staticAllowlist = validateTask51StaticAllowlist(runnerUrl, staticUrls, {
    currentSources,
  });
  if (!currentSources && staticRequestCounts !== null)
    throw new Error("TASK51_NETWORK_STATIC_REQUEST_COUNTS_REJECTED");
  if (currentSources && !Array.isArray(staticRequestCounts))
    throw new Error("TASK51_NETWORK_STATIC_REQUEST_COUNTS_REJECTED");
  const allowedStaticCounts = validateTask51StaticRequestCounts(
    staticUrls,
    staticRequestCounts
  );
  if (publicStartupLifecycle !== null) {
    if (!currentSources) throw new Error("TASK51_PUBLIC_STARTUP_PLAN_REJECTED");
    assertTask51PublicStartupLifecyclePlan(
      publicStartupLifecycle,
      staticUrls,
      staticRequestCounts
    );
  }
  const staticBounds = new Map(
    (publicStartupLifecycle?.staticRequestBounds ?? []).map((entry) => [
      entry.url,
      entry,
    ])
  );
  const exceptionalTerminals = [];
  let startupNavigation = null;
  const apiEndpointUrls = new Set(TASK51_BUSINESS_LEDGER.map(({ url }) => url));
  const started = new Map();
  const transcript = [];
  const startedStaticUrls = new Map();
  const optionBusinessIndexes = new Set();
  const previouslyStartedSignatures = new Set();
  let armed = false;
  let finalized = false;
  let nextBusinessIndex = 0;
  let businessTerminalCount = 0;
  let businessActiveCount = 0;
  let optionsCount = 0;
  let staticRequestCount = 0;
  let unexpectedRequestCount = 0;
  let redirectCount = 0;
  let retryCount = 0;
  let failureCount = 0;

  function violate(code) {
    unexpectedRequestCount += 1;
    onViolation(code);
    return Object.freeze({ allowed: false, code });
  }

  function arm(currentUrl) {
    if (armed || finalized) throw new Error("TASK51_NETWORK_DUPLICATE_ARM");
    if (!isTask51RunnerPageUrl(currentUrl)) {
      throw new Error("TASK51_NETWORK_ARM_URL_MISMATCH");
    }
    if (
      started.size !== 0 ||
      businessActiveCount !== 0 ||
      nextBusinessIndex !== 0
    ) {
      throw new Error("TASK51_NETWORK_ARM_BUSINESS_NOT_QUIET");
    }
    if (
      publicStartupLifecycle &&
      (failureCount !== 0 || unexpectedRequestCount !== 0)
    )
      throw new Error("TASK51_NETWORK_ARM_FAILED_STATE");
    armed = true;
  }

  function beginRequest(input) {
    if (finalized) return violate("TASK51_NETWORK_REQUEST_AFTER_FINALIZE");
    let descriptor;
    try {
      descriptor = safeDescriptor(input);
    } catch (error) {
      violate(
        error instanceof Error
          ? error.message
          : "TASK51_NETWORK_UNSAFE_REQUEST_DESCRIPTOR"
      );
      throw error;
    }
    if (started.has(descriptor.id)) {
      retryCount += 1;
      return violate("TASK51_NETWORK_DUPLICATE_REQUEST_ID");
    }
    if (descriptor.redirected) {
      redirectCount += 1;
      return violate("TASK51_NETWORK_REDIRECT_REJECTED");
    }
    if (descriptor.resourceType === "websocket") {
      return violate("TASK51_NETWORK_FORBIDDEN_WEBSOCKET");
    }
    if (descriptor.resourceType === "ping") {
      return violate("TASK51_NETWORK_FORBIDDEN_BEACON");
    }

    const staticRequest =
      descriptor.method === "GET" && staticAllowlist.has(descriptor.url);
    if (staticRequest) {
      if (
        descriptor.corsRequestMethod !== null ||
        descriptor.corsRequestHeaderNames !== null
      ) {
        return violate("TASK51_NETWORK_STATIC_CORS_METADATA_REJECTED");
      }
      if (armed && nextBusinessIndex !== 0) {
        return violate("TASK51_NETWORK_STATIC_AFTER_BUSINESS");
      }
      if (
        (startedStaticUrls.get(descriptor.url) ?? 0) >=
        allowedStaticCounts.get(descriptor.url)
      ) {
        retryCount += 1;
        return violate("TASK51_NETWORK_DUPLICATE_STATIC_REQUEST");
      }
      const transcriptEntry = {
        byteLength: null,
        businessIndex: null,
        category: "static",
        contentSha256: null,
        corsMethod: descriptor.corsRequestMethod,
        corsNames: descriptor.corsRequestHeaderNames,
        httpStatus: null,
        method: descriptor.method,
        resourceType: descriptor.resourceType,
        sequence: transcript.length + 1,
        terminal: null,
        url: descriptor.url,
      };
      const record = Object.freeze({
        category: "static",
        descriptor,
        transcriptEntry,
      });
      started.set(descriptor.id, record);
      transcript.push(transcriptEntry);
      startedStaticUrls.set(
        descriptor.url,
        (startedStaticUrls.get(descriptor.url) ?? 0) + 1
      );
      staticRequestCount += 1;
      return Object.freeze({ allowed: true, category: "static" });
    }

    if (!armed) return violate("TASK51_NETWORK_BUSINESS_BEFORE_ARM");

    if (descriptor.method === "OPTIONS") {
      const expected = TASK51_BUSINESS_LEDGER[nextBusinessIndex];
      const expectedCorsHeaderNames =
        expected?.kind === "login-post"
          ? "content-type"
          : expected?.kind === "logout-post"
            ? "authorization,content-type"
            : "authorization";
      if (
        !expected ||
        !apiEndpointUrls.has(descriptor.url) ||
        descriptor.url !== expected.url ||
        !["fetch", "other"].includes(descriptor.resourceType) ||
        descriptor.corsRequestMethod !== expected.method ||
        descriptor.corsRequestHeaderNames !== expectedCorsHeaderNames ||
        optionBusinessIndexes.has(nextBusinessIndex) ||
        started.size !== 0
      ) {
        return violate("TASK51_NETWORK_OPTIONS_REJECTED");
      }
      const transcriptEntry = {
        byteLength: null,
        businessIndex: nextBusinessIndex,
        category: "options",
        contentSha256: null,
        corsMethod: descriptor.corsRequestMethod,
        corsNames: descriptor.corsRequestHeaderNames,
        httpStatus: null,
        method: descriptor.method,
        resourceType: descriptor.resourceType,
        sequence: transcript.length + 1,
        terminal: null,
        url: descriptor.url,
      };
      const record = Object.freeze({
        category: "options",
        descriptor,
        expected,
        transcriptEntry,
      });
      started.set(descriptor.id, record);
      transcript.push(transcriptEntry);
      optionBusinessIndexes.add(nextBusinessIndex);
      optionsCount += 1;
      return Object.freeze({ allowed: true, category: "options" });
    }

    const expected = TASK51_BUSINESS_LEDGER[nextBusinessIndex];
    const signature = signatureOf(descriptor);
    if (!expected) {
      if (previouslyStartedSignatures.has(signature)) retryCount += 1;
      return violate("TASK51_NETWORK_BUSINESS_TOTAL_EXCEEDED");
    }
    if (
      descriptor.corsRequestMethod !== null ||
      descriptor.corsRequestHeaderNames !== null ||
      descriptor.method !== expected.method ||
      descriptor.url !== expected.url ||
      !SAFE_RESOURCE_TYPES.has(descriptor.resourceType)
    ) {
      if (previouslyStartedSignatures.has(signature)) retryCount += 1;
      return violate("TASK51_NETWORK_BUSINESS_ORDER_REJECTED");
    }
    if (businessActiveCount !== 0 || started.size !== 0) {
      retryCount += 1;
      return violate("TASK51_NETWORK_BUSINESS_NOT_SERIAL");
    }

    const transcriptEntry = {
      byteLength: null,
      businessIndex: nextBusinessIndex,
      category: "business",
      contentSha256: null,
      corsMethod: descriptor.corsRequestMethod,
      corsNames: descriptor.corsRequestHeaderNames,
      httpStatus: null,
      method: descriptor.method,
      resourceType: descriptor.resourceType,
      sequence: transcript.length + 1,
      terminal: null,
      url: descriptor.url,
    };
    started.set(
      descriptor.id,
      Object.freeze({
        category: "business",
        descriptor,
        expected,
        transcriptEntry,
      })
    );
    transcript.push(transcriptEntry);
    previouslyStartedSignatures.add(signature);
    nextBusinessIndex += 1;
    businessActiveCount += 1;
    return Object.freeze({
      allowed: true,
      category: "business",
      businessIndex: nextBusinessIndex - 1,
    });
  }

  function terminateRequest(id, failed, metadata = null) {
    const record = started.get(id);
    if (!record) return violate("TASK51_NETWORK_UNKNOWN_REQUEST_TERMINAL");
    started.delete(id);
    if (record.category === "business") {
      businessActiveCount -= 1;
      businessTerminalCount += 1;
    }
    if (failed) {
      failureCount += 1;
      record.transcriptEntry.terminal = "failed";
    } else {
      let safeMetadata;
      try {
        safeMetadata = safeTerminalMetadata(
          metadata,
          record.category,
          record.expected
        );
      } catch (error) {
        violate(
          error instanceof Error
            ? error.message
            : "TASK51_NETWORK_UNSAFE_TERMINAL_METADATA"
        );
        throw error;
      }
      record.transcriptEntry.byteLength = safeMetadata.byteLength;
      record.transcriptEntry.contentSha256 = safeMetadata.contentSha256;
      record.transcriptEntry.httpStatus = safeMetadata.httpStatus;
      record.transcriptEntry.terminal = "succeeded";
    }
    return Object.freeze({ allowed: true, category: record.category });
  }

  function finishRequest(id, metadata) {
    return terminateRequest(id, false, metadata);
  }

  function failRequest(id) {
    return terminateRequest(id, true);
  }

  function finishNavigationRequest(id, proof, navigation) {
    const record = started.get(id);
    if (
      !publicStartupLifecycle ||
      armed ||
      finalized ||
      record?.category !== "static"
    )
      throw new Error("TASK51_PUBLIC_STARTUP_TERMINAL_REJECTED");
    const entry = { ...proof, sequence: record.transcriptEntry.sequence };
    assertTask51PublicStartupLifecycleReceipt(
      {
        schema: "wp3-task51-public-startup-lifecycle-receipt-v1",
        navigation,
        firstAuthenticationRequest: null,
        phaseBoundaries: {
          authenticationStartedAt: null,
          quietStartedAt: null,
          strictStartedAt: null,
        },
        exceptionalTerminals: [...exceptionalTerminals, entry],
        publicReadTerminals: [],
        staticTerminalCounts: {
          successfulStatic: transcript.filter(
            (item) =>
              item.category === "static" && item.terminal === "succeeded"
          ).length,
          navigationCancelled: [...exceptionalTerminals, entry].filter(
            (item) => item.terminal === "navigation-cancelled"
          ).length,
          navigationBodyUnavailable: [...exceptionalTerminals, entry].filter(
            (item) => item.terminal === "navigation-body-unavailable"
          ).length,
        },
      },
      publicStartupLifecycle
    );
    if (
      entry.url !== record.descriptor.url ||
      entry.resourceType !== record.descriptor.resourceType
    )
      throw new Error("TASK51_PUBLIC_STARTUP_TERMINAL_REJECTED");
    if (
      startupNavigation !== null &&
      JSON.stringify(startupNavigation) !== JSON.stringify(navigation)
    )
      throw new Error("TASK51_PUBLIC_STARTUP_NAVIGATION_REJECTED");
    startupNavigation = structuredClone(navigation);
    exceptionalTerminals.push(Object.freeze(entry));
    record.transcriptEntry.terminal = entry.terminal;
    record.transcriptEntry.httpStatus = entry.httpStatus;
    started.delete(id);
    return Object.freeze({
      allowed: true,
      category: "static",
      terminal: entry.terminal,
    });
  }

  function recordForbiddenChannel(channel) {
    if (
      ![
        "beacon",
        "download",
        "iframe",
        "navigation",
        "popup",
        "service-worker",
        "websocket",
      ].includes(channel)
    ) {
      throw new Error("TASK51_NETWORK_UNKNOWN_FORBIDDEN_CHANNEL");
    }
    return violate(`TASK51_NETWORK_FORBIDDEN_${channel.toUpperCase()}`);
  }

  function snapshot() {
    return Object.freeze({
      armed,
      expectedBusinessRequestCount: TASK51_EXPECTED_BUSINESS_REQUEST_COUNT,
      expectedStaticRequestCount: publicStartupLifecycle
        ? staticRequestCount
        : [...allowedStaticCounts.values()].reduce(
            (sum, count) => sum + count,
            0
          ),
      startedBusinessRequestCount: nextBusinessIndex,
      terminalBusinessRequestCount: businessTerminalCount,
      activeBusinessRequestCount: businessActiveCount,
      activeRequestCount: started.size,
      loginPostCount: TASK51_BUSINESS_LEDGER.slice(0, nextBusinessIndex).filter(
        ({ kind }) => kind === "login-post"
      ).length,
      logoutPostCount: TASK51_BUSINESS_LEDGER.slice(
        0,
        nextBusinessIndex
      ).filter(({ kind }) => kind === "logout-post").length,
      evidenceGetCount: Math.max(0, nextBusinessIndex - 8),
      optionsCount,
      staticRequestCount,
      unexpectedRequestCount,
      redirectCount,
      retryCount,
      failureCount,
      strictlyOrdered: unexpectedRequestCount === 0 && retryCount === 0,
      transcript: Object.freeze(
        transcript.map((entry) => Object.freeze({ ...entry }))
      ),
    });
  }

  function finalize() {
    if (finalized) throw new Error("TASK51_NETWORK_DUPLICATE_FINALIZE");
    const value = snapshot();
    if (
      !value.armed ||
      value.startedBusinessRequestCount !==
        TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
      value.terminalBusinessRequestCount !==
        TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
      value.activeBusinessRequestCount !== 0 ||
      value.activeRequestCount !== 0 ||
      value.loginPostCount !== 4 ||
      value.logoutPostCount !== 4 ||
      value.evidenceGetCount !== 56 ||
      value.unexpectedRequestCount !== 0 ||
      value.redirectCount !== 0 ||
      value.retryCount !== 0 ||
      value.failureCount !== 0 ||
      value.staticRequestCount !== value.expectedStaticRequestCount ||
      value.transcript.length !==
        value.expectedStaticRequestCount +
          value.optionsCount +
          TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
      value.transcript.some(
        (entry) =>
          entry.terminal !== "succeeded" &&
          !(
            publicStartupLifecycle &&
            entry.category === "static" &&
            exceptionalTerminals.some(
              (proof) =>
                proof.sequence === entry.sequence &&
                proof.terminal === entry.terminal
            )
          )
      ) ||
      (publicStartupLifecycle &&
        [...staticBounds.values()].some((entry) => {
          const count = startedStaticUrls.get(entry.url) ?? 0;
          return count < entry.minimumCount || count > entry.maximumCount;
        }))
    ) {
      throw new Error("TASK51_NETWORK_FINALIZE_REJECTED");
    }
    finalized = true;
    return value;
  }

  return Object.freeze({
    arm,
    beginRequest,
    failRequest,
    finishNavigationRequest,
    publicStartupLifecycleSnapshot: () => ({
      schema: "wp3-task51-public-startup-lifecycle-receipt-v1",
      navigation: structuredClone(startupNavigation),
      exceptionalTerminals: structuredClone(exceptionalTerminals),
      publicReadTerminals: [],
      firstAuthenticationRequest: null,
      phaseBoundaries: {
        authenticationStartedAt: null,
        quietStartedAt: null,
        strictStartedAt: null,
      },
      staticTerminalCounts: {
        successfulStatic: transcript.filter(
          (item) => item.category === "static" && item.terminal === "succeeded"
        ).length,
        navigationCancelled: exceptionalTerminals.filter(
          (item) => item.terminal === "navigation-cancelled"
        ).length,
        navigationBodyUnavailable: exceptionalTerminals.filter(
          (item) => item.terminal === "navigation-body-unavailable"
        ).length,
      },
    }),
    finalize,
    finishRequest,
    recordForbiddenChannel,
    snapshot,
  });
}

export const TASK51_NETWORK_CONSTANTS = Object.freeze({
  apiOrigins: API_ORIGINS,
  evidencePaths: EVIDENCE_PATHS,
  loginPath: LOGIN_PATH,
  logoutPath: LOGOUT_PATH,
  productionOrigin: PRODUCTION_ORIGIN,
  runnerPath: RUNNER_PATH,
});
