const PRODUCTION_ORIGIN = "https://d.xrugc.com";
const RUNNER_PATH = "/internal/task51/memory-isolated-runner";
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
  parsed.hash = "";
  return parsed.href;
}

function isForbiddenSameOriginPath(pathname) {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/api-auth" ||
    pathname.startsWith("/api-auth/")
  );
}

export function validateTask51StaticAllowlist(runnerUrl, staticUrls) {
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

  if (!Array.isArray(staticUrls) || staticUrls.length === 0) {
    throw new Error("TASK51_NETWORK_STATIC_URL_REJECTED");
  }
  const allowed = new Set();
  for (const value of staticUrls) {
    const parsed = new URL(value);
    if (
      parsed.origin !== PRODUCTION_ORIGIN ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      isForbiddenSameOriginPath(parsed.pathname)
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
  onViolation = () => {},
} = {}) {
  const staticAllowlist = validateTask51StaticAllowlist(runnerUrl, staticUrls);
  const apiEndpointUrls = new Set(TASK51_BUSINESS_LEDGER.map(({ url }) => url));
  const started = new Map();
  const transcript = [];
  const startedStaticUrls = new Set();
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
    if (normalizedNetworkUrl(currentUrl) !== normalizedNetworkUrl(runnerUrl)) {
      throw new Error("TASK51_NETWORK_ARM_URL_MISMATCH");
    }
    if (
      started.size !== 0 ||
      businessActiveCount !== 0 ||
      nextBusinessIndex !== 0
    ) {
      throw new Error("TASK51_NETWORK_ARM_BUSINESS_NOT_QUIET");
    }
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
      if (startedStaticUrls.has(descriptor.url)) {
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
      startedStaticUrls.add(descriptor.url);
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
      expectedStaticRequestCount: staticAllowlist.size,
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
      value.transcript.some((entry) => entry.terminal !== "succeeded")
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
