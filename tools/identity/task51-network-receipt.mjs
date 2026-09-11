import { createHash } from "node:crypto";

import {
  TASK51_BUSINESS_LEDGER,
  TASK51_BOOTSTRAP_READ_ALLOWLIST,
  TASK51_EXPECTED_BUSINESS_REQUEST_COUNT,
  TASK51_NETWORK_CONSTANTS,
  TASK51_NETWORK_RECEIPT_SCHEMA,
  validateTask51StaticAllowlist,
  validateTask51StaticRequestCounts,
} from "./task51-network-attestor-ledger.mjs";
import { assertTask51PrewarmContract } from "./task51-stage-b-supervisor.mjs";

const FORBIDDEN_FIELD = /(authorization|body|cookie|header|postdata|token)/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const GIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
export const TASK51_EXECUTION_SOURCES_SCHEMA =
  "wp3-task51-stage-b-execution-sources-v1";
export const TASK51_CURRENT_NETWORK_RECEIPT_SCHEMA =
  "wp3-task51-safe-network-receipt-v3";
export const TASK51_MAX_STATIC_RESPONSE_BYTES = 32 * 1024 * 1024;
export const TASK51_MAX_STATIC_TOTAL_BYTES = 96 * 1024 * 1024;
const APPROVAL_PATTERN =
  /^WP3-TASK51-[A-Z0-9-]*MEMORY-RUNNER[A-Z0-9-]*STAGE-B-[0-9]{8}$/;
const EXECUTION_PATTERN = /^task51-stage-b-[a-z0-9-]{8,96}$/;
const STAGE_A_EVIDENCE_REF_PATTERN = /^reports\/[A-Za-z0-9._/-]+\.json$/;
const TASK51_NETWORK_ATTESTOR_CANDIDATE_FILES = Object.freeze([
  "tools/identity/task51-network-attestor-ledger.mjs",
  "tools/identity/task51-network-receipt.mjs",
  "tools/identity/run-task51-headed-network-attestor.mjs",
  "tools/identity/task51-stage-b-supervisor.mjs",
  "test/unit/task51/task51NetworkAttestor.spec.ts",
  "test/unit/task51/task51StageBSupervisor.spec.ts",
]);
const RECEIPT_KEYS = Object.freeze([
  "approvalRef",
  "attestor",
  "browserRelease",
  "executionId",
  "finalizedAt",
  "flags",
  "network",
  "runnerFragmentSha256",
  "schema",
  "servedRelease",
  "stageANetworkAttestorReleaseEvidenceSha256",
  "stageBExecutionEvidenceSha256",
  "staticUrlManifest",
  "webReleaseSha",
]);
const ATTESTOR_KEYS = Object.freeze([
  "candidateContentSha256",
  "publishCommitSha",
  "publishTreeSha",
  "releaseEvidenceSha256",
]);
const SERVED_RELEASE_KEYS = Object.freeze([
  "assetManifestSha256",
  "entrySha256",
  "imageDigest",
  "ociRevision",
]);
const BROWSER_RELEASE_KEYS = Object.freeze([
  "binarySha256",
  "channel",
  "version",
]);
const STATIC_MANIFEST_KEYS = Object.freeze([
  "hashAlgorithm",
  "responses",
  "sha256",
  "urls",
]);
const STATIC_RESPONSE_KEYS = Object.freeze([
  "byteLength",
  "contentSha256",
  "httpStatus",
  "sequence",
  "url",
]);
const TRANSCRIPT_ENTRY_KEYS = Object.freeze([
  "byteLength",
  "businessIndex",
  "category",
  "contentSha256",
  "corsMethod",
  "corsNames",
  "httpStatus",
  "method",
  "resourceType",
  "sequence",
  "terminal",
  "url",
]);
const FLAG_KEYS = Object.freeze([
  "ephemeralContext",
  "headedBrowser",
  "noDownloads",
  "noPopups",
  "noServiceWorkers",
  "noWebSockets",
  "singlePage",
  "strictWindowArmed",
]);
const NETWORK_KEYS = Object.freeze([
  "activeBusinessRequestCount",
  "activeRequestCount",
  "evidenceGetCount",
  "expectedBusinessRequestCount",
  "expectedStaticRequestCount",
  "failureCount",
  "loginPostCount",
  "logoutPostCount",
  "optionsCount",
  "redirectCount",
  "retryCount",
  "startedBusinessRequestCount",
  "staticRequestCount",
  "strictlyOrdered",
  "terminalBusinessRequestCount",
  "transcript",
  "transcriptSha256",
  "unexpectedRequestCount",
]);

const STAGE_A_ATTESTOR_KEYS = Object.freeze([
  "approvalRef",
  "completedAt",
  "networkAttestorRelease",
  "schema",
  "status",
  "webStageAReleaseEvidenceSha256",
]);
const STAGE_A_ATTESTOR_RELEASE_KEYS = Object.freeze([
  "browser",
  "candidateContentHashAlgorithm",
  "candidateContentSha256",
  "candidateFileCount",
  "candidateFileManifest",
  "ciCompletedAt",
  "ciHeadSha",
  "ciPassed",
  "ciRunId",
  "ciTreeSha",
  "cleanCheckoutImportSmokeAt",
  "cleanCheckoutImportSmokePassed",
  "developCommitSha",
  "developCandidateContentSha256",
  "developCandidateTreeSha",
  "developTreeSha",
  "evidenceRef",
  "mainCommitSha",
  "mainCandidateContentSha256",
  "mainCandidateTreeSha",
  "mainTreeSha",
  "networkProvenance",
  "nodeVersion",
  "nonForcePromotions",
  "playwrightVersion",
  "publishCommitSha",
  "publishCandidateContentSha256",
  "publishCandidateTreeSha",
  "publishTreeSha",
]);
const STAGE_A_ATTESTOR_PROVENANCE_KEYS = Object.freeze([
  "bootstrapReadAllowlist",
  "evidenceRef",
  "productionOrigin",
  "receiptSchema",
  "releaseProvenanceExact",
  "runnerRoute",
  "servedAssetManifestSha256",
  "servedAssetManifestHashAlgorithm",
  "servedEntrySha256",
  "servedWebImageDigest",
  "servedWebOciRevision",
  "servedWebRevision",
  "staticUrlManifest",
  "staticUrlManifestHashAlgorithm",
  "staticUrlManifestSha256",
  "staticResponses",
]);
const STAGE_A_BROWSER_KEYS = Object.freeze([
  "binarySha256",
  "channel",
  "evidenceRef",
  "headed",
  "pinned",
  "serviceWorkersBlocked",
  "version",
  "webSocketsBlocked",
]);
const STAGE_A_STATIC_RESPONSE_KEYS = Object.freeze([
  "byteLength",
  "contentSha256",
  "url",
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

export function assertTask51ReceiptHasNoForbiddenFields(value) {
  if (Array.isArray(value)) {
    for (const item of value) assertTask51ReceiptHasNoForbiddenFields(item);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELD.test(key)) {
      throw new Error(`TASK51_NETWORK_RECEIPT_FORBIDDEN_FIELD:${key}`);
    }
    assertTask51ReceiptHasNoForbiddenFields(child);
  }
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalValue(value[key])])
  );
}

function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function canonicalTask51Json(value) {
  return JSON.stringify(canonicalValue(value));
}

export function task51Sha256(value) {
  const bytes =
    typeof value === "string" || value instanceof Uint8Array
      ? value
      : canonicalTask51Json(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function assertBinding(value, name, pattern = /^[A-Za-z0-9._:-]{8,160}$/) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`TASK51_NETWORK_RECEIPT_INVALID_${name}`);
  }
}

function assertNonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`TASK51_NETWORK_RECEIPT_INVALID_${name}`);
  }
}

function assertTimestamp(value, name) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`TASK51_NETWORK_RECEIPT_INVALID_${name}`);
  }
}

function validStageATimestamp(value) {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(
      value
    );
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }
  if (match[8] !== "Z") {
    const offsetHour = Number(match[10]);
    const offsetMinute = Number(match[11]);
    if (
      offsetHour > 14 ||
      offsetMinute > 59 ||
      (offsetHour === 14 && offsetMinute !== 0)
    ) {
      return false;
    }
  }
  return Number.isFinite(Date.parse(value));
}

function isTask51EvidenceRef(value) {
  if (typeof value !== "string" || !STAGE_A_EVIDENCE_REF_PATTERN.test(value)) {
    return false;
  }
  const segments = value.split("/");
  return (
    segments[0] === "reports" &&
    segments
      .slice(1)
      .every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function sourceBinding(value) {
  return (
    hasExactKeys(value, ["evidenceRef", "evidenceSha256"]) &&
    typeof value.evidenceRef === "string" &&
    value.evidenceRef.length <= 256 &&
    /^reports\/[A-Za-z0-9._/-]+\.(?:json|jsonl|log)$/.test(value.evidenceRef) &&
    !value.evidenceRef
      .split("/")
      .some((part) => part === "" || part === "." || part === "..") &&
    SHA256_PATTERN.test(value.evidenceSha256)
  );
}

function sourceCi(value) {
  return (
    ["ciRunId", "ciRunAttempt", "ciJobId"].every(
      (key) => Number.isSafeInteger(value[key]) && value[key] > 0
    ) &&
    validStageATimestamp(value.ciCompletedAt) &&
    ["runTranscript", "jobsTranscript", "jobLog"].every((key) =>
      sourceBinding(value[key])
    )
  );
}

/** Shared structural contract only. Git/CI/public-source authenticity and the
 * independent release-owner authority are separate mandatory preclaim gates. */
export function parseTask51StageBExecutionSources(raw) {
  const error = () => {
    throw new Error("TASK51_EXECUTION_SOURCES_REJECTED");
  };
  let text;
  let value;
  try {
    text =
      typeof raw === "string"
        ? raw
        : new TextDecoder("utf-8", { fatal: true }).decode(raw);
    if (Buffer.byteLength(text) > 512 * 1024) error();
    value = JSON.parse(text);
  } catch {
    error();
  }
  if (
    `${canonicalTask51Json(value)}\n` !== text ||
    !/^[\x00-\x7f]*$/.test(text) ||
    !hasExactKeys(value, [
      "schema",
      "approvalRef",
      "executionId",
      "generatedAt",
      "historicalStageAFreezeSha256",
      "historicalStageANetworkAttestor",
      "currentWeb",
      "localTool",
      "browser",
      "prewarm",
      "publicSources",
      "observerSources",
    ]) ||
    value.schema !== TASK51_EXECUTION_SOURCES_SCHEMA ||
    !APPROVAL_PATTERN.test(value.approvalRef) ||
    !EXECUTION_PATTERN.test(value.executionId) ||
    !validStageATimestamp(value.generatedAt) ||
    !SHA256_PATTERN.test(value.historicalStageAFreezeSha256) ||
    !sourceBinding(value.historicalStageANetworkAttestor)
  )
    error();
  const web = value.currentWeb;
  if (
    !hasExactKeys(web, [
      "repository",
      "develop",
      "publish",
      "networkProvenance",
    ]) ||
    web.repository !== "gdgeek/vue3.7dgame.com"
  )
    error();
  const ciKeys = [
    "ciRunId",
    "ciRunAttempt",
    "ciJobId",
    "ciCompletedAt",
    "runTranscript",
    "jobsTranscript",
    "jobLog",
  ];
  for (const branch of ["develop", "publish"]) {
    const release = web[branch];
    if (
      !hasExactKeys(release, [
        "branch",
        "commitSha",
        "treeSha",
        "indexDigest",
        "configDigest",
        "commitTranscript",
        ...ciKeys,
      ]) ||
      release.branch !== branch ||
      !GIT_SHA_PATTERN.test(release.commitSha) ||
      !GIT_SHA_PATTERN.test(release.treeSha) ||
      !/^sha256:[a-f0-9]{64}$/.test(release.indexDigest) ||
      !/^sha256:[a-f0-9]{64}$/.test(release.configDigest) ||
      release.indexDigest === release.configDigest ||
      !sourceBinding(release.commitTranscript) ||
      !sourceCi(release) ||
      Date.parse(release.ciCompletedAt) > Date.parse(value.generatedAt)
    )
      error();
  }
  const tool = value.localTool;
  if (
    !hasExactKeys(tool, [
      "repository",
      "branch",
      "commitSha",
      "treeSha",
      "candidateContentHashAlgorithm",
      "candidateContentSha256",
      "candidateFileManifest",
      ...ciKeys,
    ]) ||
    tool.repository !== web.repository ||
    !/^codex\/[A-Za-z0-9._/-]+$/.test(tool.branch) ||
    tool.branch.includes("..") ||
    !GIT_SHA_PATTERN.test(tool.commitSha) ||
    !GIT_SHA_PATTERN.test(tool.treeSha) ||
    tool.candidateContentHashAlgorithm !== "sha256-path-nul-git-blob-sha-v1" ||
    !SHA256_PATTERN.test(tool.candidateContentSha256) ||
    JSON.stringify(tool.candidateFileManifest) !==
      JSON.stringify(TASK51_NETWORK_ATTESTOR_CANDIDATE_FILES) ||
    !sourceCi(tool) ||
    Date.parse(tool.ciCompletedAt) > Date.parse(value.generatedAt)
  )
    error();
  if (
    !hasExactKeys(value.browser, BROWSER_RELEASE_KEYS) ||
    value.browser.channel !== "chromium" ||
    !/^\d+\.\d+\.\d+\.\d+$/.test(value.browser.version) ||
    !SHA256_PATTERN.test(value.browser.binarySha256)
  )
    error();
  assertTask51PrewarmContract(value.prewarm);
  const p = web.networkProvenance;
  if (
    !hasExactKeys(p, [
      ...STAGE_A_ATTESTOR_PROVENANCE_KEYS,
      "staticRequestCounts",
    ]) ||
    p.receiptSchema !== TASK51_CURRENT_NETWORK_RECEIPT_SCHEMA ||
    p.productionOrigin !== TASK51_NETWORK_CONSTANTS.productionOrigin ||
    p.runnerRoute !== TASK51_NETWORK_CONSTANTS.runnerPath ||
    p.releaseProvenanceExact !== true ||
    p.servedWebRevision !== web.publish.commitSha ||
    p.servedWebOciRevision !== web.publish.commitSha ||
    p.servedWebImageDigest !== web.publish.indexDigest ||
    p.staticUrlManifestHashAlgorithm !== "sha256-lf-utf8-url-list-v1" ||
    p.servedAssetManifestHashAlgorithm !==
      "sha256-canonical-static-response-manifest-v1" ||
    !isTask51EvidenceRef(p.evidenceRef) ||
    JSON.stringify(p.bootstrapReadAllowlist) !==
      JSON.stringify(value.prewarm.bootstrapReads.map(({ url }) => url))
  )
    error();
  const urls = [
    ...validateTask51StaticAllowlist(
      `${p.productionOrigin}${p.runnerRoute}`,
      p.staticUrlManifest,
      { currentSources: true }
    ),
  ];
  if (!Array.isArray(p.staticRequestCounts)) error();
  const counts = validateTask51StaticRequestCounts(urls, p.staticRequestCounts);
  if (
    p.staticUrlManifestSha256 !== task51StaticUrlManifestSha256(urls) ||
    !Array.isArray(p.staticResponses) ||
    p.staticResponses.length !== urls.length ||
    p.staticResponses.some(
      (response, index) =>
        !hasExactKeys(response, STAGE_A_STATIC_RESPONSE_KEYS) ||
        response.url !== urls[index] ||
        !Number.isSafeInteger(response.byteLength) ||
        response.byteLength < 0 ||
        response.byteLength > TASK51_MAX_STATIC_RESPONSE_BYTES ||
        !SHA256_PATTERN.test(response.contentSha256)
    ) ||
    p.staticResponses.reduce(
      (sum, response) => sum + response.byteLength * counts.get(response.url),
      0
    ) > TASK51_MAX_STATIC_TOTAL_BYTES ||
    p.servedAssetManifestSha256 !==
      task51StaticResponseManifestSha256(p.staticResponses) ||
    p.staticResponses.find(({ url }) => url === `${p.productionOrigin}/`)
      ?.contentSha256 !== p.servedEntrySha256 ||
    value.prewarm.documentUrls.some(
      (url) => !urls.includes(url) || counts.get(url) !== 1
    )
  )
    error();
  if (
    !Array.isArray(value.publicSources) ||
    value.publicSources.length < 1 ||
    value.publicSources.length > 1024 ||
    value.publicSources.some(
      (entry) =>
        !hasExactKeys(entry, ["url", "evidenceRef", "evidenceSha256"]) ||
        !sourceBinding({
          evidenceRef: entry.evidenceRef,
          evidenceSha256: entry.evidenceSha256,
        }) ||
        !validPublicSourceUrl(entry.url)
    ) ||
    new Set(value.publicSources.map(({ url }) => url)).size !==
      value.publicSources.length ||
    new Set(value.publicSources.map(({ evidenceRef }) => evidenceRef)).size !==
      value.publicSources.length ||
    urls.some(
      (url) => !value.publicSources.some((entry) => entry.url === url)
    ) ||
    value.prewarm.bootstrapReads.some(
      (read) =>
        read.phase === "before-login-public" &&
        !value.publicSources.some((entry) => entry.url === read.url)
    ) ||
    value.prewarm.bootstrapReads.some((read) => urls.includes(read.url))
  )
    error();
  if (
    !Array.isArray(value.observerSources) ||
    value.observerSources.length !== 2 ||
    value.observerSources.some(
      (entry, index) =>
        !hasExactKeys(entry, [
          "node",
          "frontdoorOrigin",
          "frontendUrl",
          "pluginManifestUrl",
        ]) ||
        entry.node !== ["xrteeth", "tmrpp"][index] ||
        !validPublicSourceUrl(entry.frontendUrl) ||
        new URL(entry.frontendUrl).origin !== entry.frontdoorOrigin ||
        ![entry.frontendUrl, entry.pluginManifestUrl].every((url) =>
          value.publicSources.some((source) => source.url === url)
        )
    )
  )
    error();
  return deepFreeze({ raw: text, sha256: task51Sha256(text), value });
}

function validPublicSourceUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.href === value &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      value.length <= 2048
    );
  } catch {
    return false;
  }
}

export function assertTask51StageBExecutionSourceBindings(
  parsed,
  { approvalRef, executionId, historicalStageA }
) {
  const reparsed = parseTask51StageBExecutionSources(parsed.raw);
  const historical = parseTask51NetworkAttestorReleaseEvidence(
    historicalStageA.raw
  );
  if (
    parsed.sha256 !== reparsed.sha256 ||
    reparsed.value.approvalRef !== approvalRef ||
    reparsed.value.executionId !== executionId ||
    historical.sha256 !== historicalStageA.sha256 ||
    reparsed.value.historicalStageANetworkAttestor.evidenceSha256 !==
      historical.sha256
  ) {
    throw new Error("TASK51_EXECUTION_SOURCE_BINDING_REJECTED");
  }
  return reparsed;
}

function assertImageDigest(value, name) {
  assertBinding(value, name, /^sha256:[a-f0-9]{64}$/);
}

export function task51StaticUrlManifestSha256(urls) {
  return task51Sha256(`${urls.join("\n")}\n`);
}

export function task51StaticResponseManifestSha256(responses) {
  return task51Sha256(
    canonicalTask51Json(
      responses.map(({ byteLength, contentSha256, url }) => ({
        byteLength,
        contentSha256,
        url,
      }))
    )
  );
}

function expectedBusinessHttpStatus(entry) {
  return entry.kind === "evidence-get" &&
    entry.path === "/v1/organization/list" &&
    (entry.role === "user" || entry.role === "manager")
    ? 403
    : 200;
}

function expectedCorsNames(entry) {
  return entry.kind === "login-post"
    ? "content-type"
    : entry.kind === "logout-post"
      ? "authorization,content-type"
      : "authorization";
}

function assertTranscript(transcript, staticUrls, requestCounts = null) {
  if (!Array.isArray(transcript)) {
    throw new Error("TASK51_NETWORK_RECEIPT_TRANSCRIPT_REJECTED");
  }
  const business = [];
  const options = [];
  const statics = [];
  let strictStarted = false;
  let nextBusinessIndex = 0;
  let optionsSeenForCurrentBusiness = false;
  for (let index = 0; index < transcript.length; index += 1) {
    const entry = transcript[index];
    if (
      !hasExactKeys(entry, TRANSCRIPT_ENTRY_KEYS) ||
      entry.sequence !== index + 1 ||
      entry.terminal !== "succeeded" ||
      typeof entry.url !== "string" ||
      typeof entry.method !== "string" ||
      typeof entry.resourceType !== "string" ||
      !Number.isSafeInteger(entry.httpStatus) ||
      entry.httpStatus < 100 ||
      entry.httpStatus > 599
    ) {
      throw new Error("TASK51_NETWORK_RECEIPT_TRANSCRIPT_REJECTED");
    }
    if (entry.category === "static") {
      if (strictStarted) {
        throw new Error("TASK51_NETWORK_RECEIPT_STATIC_TRANSCRIPT_REJECTED");
      }
      if (
        entry.businessIndex !== null ||
        entry.method !== "GET" ||
        entry.corsMethod !== null ||
        entry.corsNames !== null ||
        entry.httpStatus !== 200 ||
        !Number.isSafeInteger(entry.byteLength) ||
        entry.byteLength < 0 ||
        typeof entry.contentSha256 !== "string" ||
        !SHA256_PATTERN.test(entry.contentSha256) ||
        !staticUrls.includes(entry.url)
      ) {
        throw new Error("TASK51_NETWORK_RECEIPT_STATIC_TRANSCRIPT_REJECTED");
      }
      statics.push(entry);
      continue;
    }
    strictStarted = true;
    if (
      !Number.isSafeInteger(entry.businessIndex) ||
      entry.businessIndex < 0 ||
      entry.businessIndex >= TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
      entry.contentSha256 !== null ||
      entry.byteLength !== null
    ) {
      throw new Error("TASK51_NETWORK_RECEIPT_BUSINESS_TRANSCRIPT_REJECTED");
    }
    const expected = TASK51_BUSINESS_LEDGER[entry.businessIndex];
    if (entry.category === "options") {
      if (
        entry.businessIndex !== nextBusinessIndex ||
        optionsSeenForCurrentBusiness ||
        entry.method !== "OPTIONS" ||
        entry.url !== expected.url ||
        !["fetch", "other"].includes(entry.resourceType) ||
        entry.corsMethod !== expected.method ||
        entry.corsNames !== expectedCorsNames(expected) ||
        (entry.httpStatus !== 200 && entry.httpStatus !== 204)
      ) {
        throw new Error("TASK51_NETWORK_RECEIPT_OPTIONS_TRANSCRIPT_REJECTED");
      }
      optionsSeenForCurrentBusiness = true;
      options.push(entry);
      continue;
    }
    if (
      entry.category !== "business" ||
      entry.businessIndex !== nextBusinessIndex ||
      entry.method !== expected.method ||
      entry.url !== expected.url ||
      entry.resourceType !== "fetch" ||
      entry.corsMethod !== null ||
      entry.corsNames !== null ||
      entry.httpStatus !== expectedBusinessHttpStatus(expected)
    ) {
      throw new Error("TASK51_NETWORK_RECEIPT_BUSINESS_TRANSCRIPT_REJECTED");
    }
    business.push(entry);
    nextBusinessIndex += 1;
    optionsSeenForCurrentBusiness = false;
  }
  const expectedCounts = validateTask51StaticRequestCounts(
    staticUrls,
    requestCounts
  );
  if (
    nextBusinessIndex !== TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
    business.length !== TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
    business.some((entry, index) => entry.businessIndex !== index) ||
    new Set(options.map((entry) => entry.businessIndex)).size !==
      options.length ||
    statics.length !==
      [...expectedCounts.values()].reduce((sum, count) => sum + count, 0) ||
    staticUrls.some(
      (url) =>
        statics.filter((entry) => entry.url === url).length !==
        expectedCounts.get(url)
    )
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_TRANSCRIPT_REJECTED");
  }
  return { business, options, statics };
}

/** Parse the canonical Stage A network-attestor release used as N's trust root. */
export function parseTask51NetworkAttestorReleaseEvidence(raw) {
  if (typeof raw !== "string" && !(raw instanceof Uint8Array)) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_BYTES_REJECTED");
  }
  let text;
  try {
    text =
      typeof raw === "string"
        ? raw
        : new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    throw new Error("TASK51_STAGE_A_ATTESTOR_BYTES_REJECTED");
  }
  if (!/^[\x00-\x7f]*$/.test(text)) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_BYTES_REJECTED");
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("TASK51_STAGE_A_ATTESTOR_JSON_REJECTED");
  }
  if (
    `${canonicalTask51Json(value)}\n` !== text ||
    !hasExactKeys(value, STAGE_A_ATTESTOR_KEYS) ||
    value.schema !==
      "wp3-task51-stage-a-network-attestor-release-evidence-v1" ||
    value.status !== "PASS" ||
    !hasExactKeys(value.networkAttestorRelease, STAGE_A_ATTESTOR_RELEASE_KEYS)
  ) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_CANONICAL_REJECTED");
  }
  assertBinding(
    value.approvalRef,
    "STAGE_A_APPROVAL_REF",
    /^WP3-REL-TASK51-[A-Z0-9-]*MEMORY-RUNNER[A-Z0-9-]*STAGE-A-[0-9]{8}$/
  );
  assertBinding(
    value.webStageAReleaseEvidenceSha256,
    "WEB_STAGE_A_SHA256",
    SHA256_PATTERN
  );
  const release = value.networkAttestorRelease;
  if (
    !validStageATimestamp(value.completedAt) ||
    !Array.isArray(release.candidateFileManifest) ||
    release.candidateFileManifest.length !==
      TASK51_NETWORK_ATTESTOR_CANDIDATE_FILES.length ||
    release.candidateFileManifest.some(
      (entry, index) => entry !== TASK51_NETWORK_ATTESTOR_CANDIDATE_FILES[index]
    ) ||
    release.candidateFileCount !==
      TASK51_NETWORK_ATTESTOR_CANDIDATE_FILES.length ||
    !Number.isSafeInteger(release.ciRunId) ||
    release.ciRunId <= 0 ||
    !validStageATimestamp(release.ciCompletedAt) ||
    !validStageATimestamp(release.cleanCheckoutImportSmokeAt) ||
    Date.parse(release.cleanCheckoutImportSmokeAt) <
      Date.parse(release.ciCompletedAt) ||
    Date.parse(value.completedAt) <
      Date.parse(release.cleanCheckoutImportSmokeAt) ||
    !/^v\d+\.\d+\.\d+$/.test(release.nodeVersion) ||
    !/^\d+\.\d+\.\d+$/.test(release.playwrightVersion) ||
    !isTask51EvidenceRef(release.evidenceRef)
  ) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_RELEASE_REJECTED");
  }
  for (const key of [
    "candidateContentSha256",
    "developCandidateContentSha256",
    "mainCandidateContentSha256",
    "publishCandidateContentSha256",
  ]) {
    assertBinding(release[key], key, SHA256_PATTERN);
  }
  for (const key of [
    "developCommitSha",
    "developTreeSha",
    "developCandidateTreeSha",
    "mainCommitSha",
    "mainTreeSha",
    "mainCandidateTreeSha",
    "publishCommitSha",
    "publishTreeSha",
    "publishCandidateTreeSha",
    "ciHeadSha",
    "ciTreeSha",
  ]) {
    assertBinding(release[key], key, GIT_SHA_PATTERN);
  }
  if (
    release.candidateContentHashAlgorithm !==
      "sha256-path-nul-git-blob-sha-v1" ||
    release.nonForcePromotions !== true ||
    release.ciPassed !== true ||
    release.cleanCheckoutImportSmokePassed !== true ||
    release.developCandidateTreeSha !== release.developTreeSha ||
    release.mainCandidateTreeSha !== release.mainTreeSha ||
    release.publishCandidateTreeSha !== release.publishTreeSha ||
    release.developCandidateContentSha256 !== release.candidateContentSha256 ||
    release.mainCandidateContentSha256 !== release.candidateContentSha256 ||
    release.publishCandidateContentSha256 !== release.candidateContentSha256 ||
    release.ciHeadSha !== release.publishCommitSha ||
    release.ciTreeSha !== release.publishTreeSha ||
    !hasExactKeys(release.browser, STAGE_A_BROWSER_KEYS) ||
    !hasExactKeys(release.networkProvenance, STAGE_A_ATTESTOR_PROVENANCE_KEYS)
  ) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_RELEASE_REJECTED");
  }
  const browser = release.browser;
  if (
    browser.channel !== "chromium" ||
    !/^\d+\.\d+\.\d+\.\d+$/.test(browser.version) ||
    !SHA256_PATTERN.test(browser.binarySha256) ||
    browser.pinned !== true ||
    browser.headed !== true ||
    browser.serviceWorkersBlocked !== true ||
    browser.webSocketsBlocked !== true ||
    !isTask51EvidenceRef(browser.evidenceRef)
  ) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_BROWSER_REJECTED");
  }
  const provenance = release.networkProvenance;
  let bootstrapReadAllowlistValid = false;
  if (
    Array.isArray(provenance.bootstrapReadAllowlist) &&
    provenance.bootstrapReadAllowlist.length ===
      TASK51_BOOTSTRAP_READ_ALLOWLIST.length
  ) {
    try {
      const bootstrapUrls = provenance.bootstrapReadAllowlist.map((value) => {
        const parsed = new URL(value);
        if (
          parsed.href !== value ||
          !TASK51_NETWORK_CONSTANTS.apiOrigins.includes(parsed.origin) ||
          parsed.username !== "" ||
          parsed.password !== "" ||
          parsed.search !== "" ||
          parsed.hash !== ""
        ) {
          throw new Error("invalid bootstrap URL");
        }
        return parsed.href;
      });
      bootstrapReadAllowlistValid =
        new Set(bootstrapUrls).size === bootstrapUrls.length &&
        bootstrapUrls.every(
          (url, index) => url === TASK51_BOOTSTRAP_READ_ALLOWLIST[index]
        );
    } catch {
      bootstrapReadAllowlistValid = false;
    }
  }
  const runnerUrl = `${TASK51_NETWORK_CONSTANTS.productionOrigin}${TASK51_NETWORK_CONSTANTS.runnerPath}`;
  const urls = [
    ...validateTask51StaticAllowlist(runnerUrl, provenance.staticUrlManifest),
  ];
  if (
    provenance.receiptSchema !== TASK51_NETWORK_RECEIPT_SCHEMA ||
    !bootstrapReadAllowlistValid ||
    provenance.productionOrigin !== TASK51_NETWORK_CONSTANTS.productionOrigin ||
    provenance.runnerRoute !== TASK51_NETWORK_CONSTANTS.runnerPath ||
    provenance.staticUrlManifestHashAlgorithm !==
      "sha256-lf-utf8-url-list-v1" ||
    task51StaticUrlManifestSha256(urls) !==
      provenance.staticUrlManifestSha256 ||
    provenance.servedAssetManifestHashAlgorithm !==
      "sha256-canonical-static-response-manifest-v1" ||
    !Array.isArray(provenance.staticResponses) ||
    provenance.staticResponses.length !== urls.length ||
    provenance.staticResponses.some(
      (response, index) =>
        !hasExactKeys(response, STAGE_A_STATIC_RESPONSE_KEYS) ||
        response.url !== urls[index] ||
        !Number.isSafeInteger(response.byteLength) ||
        response.byteLength < 0 ||
        response.byteLength > TASK51_MAX_STATIC_RESPONSE_BYTES ||
        !SHA256_PATTERN.test(response.contentSha256)
    ) ||
    provenance.staticResponses.reduce(
      (total, response) =>
        total +
        (Number.isSafeInteger(response?.byteLength) ? response.byteLength : 0),
      0
    ) > TASK51_MAX_STATIC_TOTAL_BYTES ||
    task51StaticResponseManifestSha256(provenance.staticResponses) !==
      provenance.servedAssetManifestSha256 ||
    provenance.servedWebRevision !== release.publishCommitSha ||
    provenance.servedWebOciRevision !== provenance.servedWebRevision ||
    provenance.releaseProvenanceExact !== true
  ) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_PROVENANCE_REJECTED");
  }
  assertBinding(
    provenance.staticUrlManifestSha256,
    "STATIC_MANIFEST_SHA256",
    SHA256_PATTERN
  );
  assertBinding(
    provenance.servedEntrySha256,
    "SERVED_ENTRY_SHA256",
    SHA256_PATTERN
  );
  assertBinding(
    provenance.servedAssetManifestSha256,
    "SERVED_ASSET_MANIFEST_SHA256",
    SHA256_PATTERN
  );
  assertImageDigest(provenance.servedWebImageDigest, "SERVED_IMAGE_DIGEST");
  if (
    !isTask51EvidenceRef(provenance.evidenceRef) ||
    new Set([release.evidenceRef, browser.evidenceRef, provenance.evidenceRef])
      .size !== 3
  ) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_EVIDENCE_REF_REJECTED");
  }
  const rootResponse = provenance.staticResponses.find(
    (response) =>
      response.url === TASK51_NETWORK_CONSTANTS.productionOrigin + "/"
  );
  if (
    !rootResponse ||
    rootResponse.contentSha256 !== provenance.servedEntrySha256
  ) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_ENTRY_REJECTED");
  }
  return deepFreeze({
    raw: text,
    sha256: task51Sha256(text),
    value,
  });
}

export function assertTask51NetworkReceipt(value) {
  assertTask51ReceiptHasNoForbiddenFields(value);
  const current = value?.schema === TASK51_CURRENT_NETWORK_RECEIPT_SCHEMA;
  if (
    !hasExactKeys(
      value,
      current ? [...RECEIPT_KEYS, "executionSourcesSha256"] : RECEIPT_KEYS
    )
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_SHAPE_REJECTED");
  }
  if (value.schema !== TASK51_NETWORK_RECEIPT_SCHEMA && !current) {
    throw new Error("TASK51_NETWORK_RECEIPT_SCHEMA_REJECTED");
  }
  assertBinding(value.approvalRef, "APPROVAL_REF", APPROVAL_PATTERN);
  assertBinding(value.executionId, "EXECUTION_ID", EXECUTION_PATTERN);
  assertBinding(
    value.stageBExecutionEvidenceSha256,
    "STAGE_B_SHA256",
    SHA256_PATTERN
  );
  assertBinding(
    value.stageANetworkAttestorReleaseEvidenceSha256,
    "STAGE_A_ATTESTOR_SHA256",
    SHA256_PATTERN
  );
  assertBinding(value.webReleaseSha, "WEB_RELEASE_SHA", GIT_SHA_PATTERN);
  assertBinding(
    value.runnerFragmentSha256,
    "RUNNER_FRAGMENT_SHA256",
    SHA256_PATTERN
  );
  assertTimestamp(value.finalizedAt, "FINALIZED_AT");

  if (current)
    assertBinding(
      value.executionSourcesSha256,
      "EXECUTION_SOURCES_SHA256",
      SHA256_PATTERN
    );
  if (
    !hasExactKeys(
      value.attestor,
      current
        ? [
            "candidateContentSha256",
            "commitSha",
            "treeSha",
            "branch",
            "releaseEvidenceSha256",
          ]
        : ATTESTOR_KEYS
    )
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_ATTESTOR_REJECTED");
  }
  assertBinding(
    value.attestor.candidateContentSha256,
    "ATTESTOR_CONTENT_SHA256",
    SHA256_PATTERN
  );
  assertBinding(
    current ? value.attestor.commitSha : value.attestor.publishCommitSha,
    "ATTESTOR_PUBLISH_COMMIT",
    GIT_SHA_PATTERN
  );
  assertBinding(
    current ? value.attestor.treeSha : value.attestor.publishTreeSha,
    "ATTESTOR_PUBLISH_TREE",
    GIT_SHA_PATTERN
  );
  if (
    current &&
    (!/^codex\/[A-Za-z0-9._/-]+$/.test(value.attestor.branch) ||
      value.attestor.branch.includes(".."))
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_ATTESTOR_REJECTED");
  }
  assertBinding(
    value.attestor.releaseEvidenceSha256,
    "ATTESTOR_RELEASE_SHA256",
    SHA256_PATTERN
  );
  if (
    value.attestor.releaseEvidenceSha256 !==
    value.stageANetworkAttestorReleaseEvidenceSha256
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_ATTESTOR_BINDING_REJECTED");
  }
  if (
    !hasExactKeys(value.browserRelease, BROWSER_RELEASE_KEYS) ||
    value.browserRelease.channel !== "chromium" ||
    !/^\d+\.\d+\.\d+\.\d+$/.test(value.browserRelease.version) ||
    !SHA256_PATTERN.test(value.browserRelease.binarySha256)
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_BROWSER_RELEASE_REJECTED");
  }
  if (!hasExactKeys(value.servedRelease, SERVED_RELEASE_KEYS)) {
    throw new Error("TASK51_NETWORK_RECEIPT_SERVED_RELEASE_REJECTED");
  }
  assertImageDigest(value.servedRelease.imageDigest, "SERVED_IMAGE_DIGEST");
  assertBinding(
    value.servedRelease.ociRevision,
    "SERVED_OCI_REVISION",
    GIT_SHA_PATTERN
  );
  assertBinding(
    value.servedRelease.entrySha256,
    "SERVED_ENTRY_SHA256",
    SHA256_PATTERN
  );
  assertBinding(
    value.servedRelease.assetManifestSha256,
    "SERVED_ASSET_SHA256",
    SHA256_PATTERN
  );
  if (
    value.webReleaseSha !== value.servedRelease.ociRevision ||
    (!current && value.webReleaseSha !== value.attestor.publishCommitSha)
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_WEB_RELEASE_BINDING_REJECTED");
  }

  if (
    !hasExactKeys(
      value.staticUrlManifest,
      current
        ? [...STATIC_MANIFEST_KEYS, "requestCounts"]
        : STATIC_MANIFEST_KEYS
    ) ||
    value.staticUrlManifest.hashAlgorithm !== "sha256-lf-utf8-url-list-v1" ||
    !Array.isArray(value.staticUrlManifest.urls)
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_STATIC_MANIFEST_REJECTED");
  }
  const runnerUrl = `${TASK51_NETWORK_CONSTANTS.productionOrigin}${TASK51_NETWORK_CONSTANTS.runnerPath}`;
  const staticUrls = [
    ...validateTask51StaticAllowlist(runnerUrl, value.staticUrlManifest.urls, {
      currentSources: current,
    }),
  ];
  if (current && !Array.isArray(value.staticUrlManifest.requestCounts))
    throw new Error("TASK51_NETWORK_STATIC_REQUEST_COUNTS_REJECTED");
  if (
    task51StaticUrlManifestSha256(staticUrls) !==
      value.staticUrlManifest.sha256 ||
    !Array.isArray(value.staticUrlManifest.responses)
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_STATIC_MANIFEST_REJECTED");
  }

  if (!hasExactKeys(value.flags, FLAG_KEYS)) {
    throw new Error("TASK51_NETWORK_RECEIPT_FLAGS_REJECTED");
  }
  if (Object.values(value.flags).some((flag) => flag !== true)) {
    throw new Error("TASK51_NETWORK_RECEIPT_FLAG_FALSE");
  }
  if (!hasExactKeys(value.network, NETWORK_KEYS)) {
    throw new Error("TASK51_NETWORK_RECEIPT_NETWORK_REJECTED");
  }
  for (const key of NETWORK_KEYS) {
    if (["strictlyOrdered", "transcript", "transcriptSha256"].includes(key))
      continue;
    assertNonNegativeInteger(value.network[key], key);
  }
  const transcriptParts = assertTranscript(
    value.network.transcript,
    staticUrls,
    current ? value.staticUrlManifest.requestCounts : null
  );
  if (
    !SHA256_PATTERN.test(value.network.transcriptSha256) ||
    task51Sha256(canonicalTask51Json(value.network.transcript)) !==
      value.network.transcriptSha256
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_TRANSCRIPT_HASH_REJECTED");
  }
  if (
    value.network.expectedBusinessRequestCount !==
      TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
    value.network.startedBusinessRequestCount !==
      TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
    value.network.terminalBusinessRequestCount !==
      TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
    value.network.activeBusinessRequestCount !== 0 ||
    value.network.activeRequestCount !== 0 ||
    value.network.loginPostCount !== 4 ||
    value.network.logoutPostCount !== 4 ||
    value.network.evidenceGetCount !== 56 ||
    value.network.unexpectedRequestCount !== 0 ||
    value.network.redirectCount !== 0 ||
    value.network.retryCount !== 0 ||
    value.network.failureCount !== 0 ||
    value.network.optionsCount > TASK51_EXPECTED_BUSINESS_REQUEST_COUNT ||
    value.network.expectedStaticRequestCount < 1 ||
    value.network.staticRequestCount !==
      value.network.expectedStaticRequestCount ||
    value.network.optionsCount !== transcriptParts.options.length ||
    value.network.staticRequestCount !== transcriptParts.statics.length ||
    value.network.strictlyOrdered !== true
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_TERMINAL_GATE_REJECTED");
  }
  if (value.staticUrlManifest.responses.length !== staticUrls.length) {
    throw new Error("TASK51_NETWORK_RECEIPT_STATIC_RESPONSE_REJECTED");
  }
  const staticTranscriptByUrl = new Map();
  for (const entry of transcriptParts.statics)
    if (!staticTranscriptByUrl.has(entry.url))
      staticTranscriptByUrl.set(entry.url, entry);
  for (
    let index = 0;
    index < value.staticUrlManifest.responses.length;
    index += 1
  ) {
    const response = value.staticUrlManifest.responses[index];
    const transcriptEntry = staticTranscriptByUrl.get(response?.url);
    if (
      !hasExactKeys(response, STATIC_RESPONSE_KEYS) ||
      response.url !== staticUrls[index] ||
      !transcriptEntry ||
      response.sequence !== transcriptEntry.sequence ||
      response.httpStatus !== transcriptEntry.httpStatus ||
      response.byteLength !== transcriptEntry.byteLength ||
      response.contentSha256 !== transcriptEntry.contentSha256 ||
      transcriptParts.statics
        .filter((entry) => entry.url === response.url)
        .some(
          (entry) =>
            entry.httpStatus !== response.httpStatus ||
            entry.byteLength !== response.byteLength ||
            entry.contentSha256 !== response.contentSha256
        )
    ) {
      throw new Error("TASK51_NETWORK_RECEIPT_STATIC_RESPONSE_REJECTED");
    }
  }
  if (
    task51StaticResponseManifestSha256(value.staticUrlManifest.responses) !==
    value.servedRelease.assetManifestSha256
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_ASSET_MANIFEST_REJECTED");
  }
  const entry = value.staticUrlManifest.responses.find(
    (response) =>
      response.url === TASK51_NETWORK_CONSTANTS.productionOrigin + "/"
  );
  if (!entry || entry.contentSha256 !== value.servedRelease.entrySha256) {
    throw new Error("TASK51_NETWORK_RECEIPT_ENTRY_REJECTED");
  }
  return true;
}

export function buildTask51NetworkReceipt(
  bindings,
  finalizedNetwork,
  observedFlags
) {
  const current = bindings.executionSourcesSha256 !== undefined;
  const staticTranscriptByUrl = new Map();
  for (const entry of finalizedNetwork.transcript.filter(
    (entry) => entry.category === "static"
  )) {
    if (!staticTranscriptByUrl.has(entry.url))
      staticTranscriptByUrl.set(entry.url, entry);
  }
  const staticResponses = bindings.staticUrls.map((url) => {
    const entry = staticTranscriptByUrl.get(url);
    if (!entry) {
      throw new Error("TASK51_NETWORK_RECEIPT_STATIC_RESPONSE_REJECTED");
    }
    const { sequence, httpStatus, byteLength, contentSha256 } = entry;
    return {
      byteLength,
      contentSha256,
      httpStatus,
      sequence,
      url,
    };
  });
  const receipt = {
    schema: current
      ? TASK51_CURRENT_NETWORK_RECEIPT_SCHEMA
      : TASK51_NETWORK_RECEIPT_SCHEMA,
    ...(current
      ? { executionSourcesSha256: bindings.executionSourcesSha256 }
      : {}),
    approvalRef: bindings.approvalRef,
    attestor: structuredClone(bindings.attestor),
    browserRelease: structuredClone(bindings.browserRelease),
    executionId: bindings.executionId,
    finalizedAt: bindings.finalizedAt,
    stageBExecutionEvidenceSha256: bindings.stageBExecutionEvidenceSha256,
    stageANetworkAttestorReleaseEvidenceSha256:
      bindings.stageANetworkAttestorReleaseEvidenceSha256,
    webReleaseSha: bindings.webReleaseSha,
    runnerFragmentSha256: bindings.runnerFragmentSha256,
    servedRelease: structuredClone(bindings.servedRelease),
    staticUrlManifest: {
      ...(current
        ? { requestCounts: structuredClone(bindings.staticRequestCounts) }
        : {}),
      hashAlgorithm: "sha256-lf-utf8-url-list-v1",
      responses: staticResponses,
      sha256: bindings.staticUrlManifestSha256,
      urls: [...bindings.staticUrls],
    },
    flags: structuredClone(observedFlags),
    network: {
      expectedBusinessRequestCount:
        finalizedNetwork.expectedBusinessRequestCount,
      startedBusinessRequestCount: finalizedNetwork.startedBusinessRequestCount,
      terminalBusinessRequestCount:
        finalizedNetwork.terminalBusinessRequestCount,
      activeBusinessRequestCount: finalizedNetwork.activeBusinessRequestCount,
      activeRequestCount: finalizedNetwork.activeRequestCount,
      loginPostCount: finalizedNetwork.loginPostCount,
      logoutPostCount: finalizedNetwork.logoutPostCount,
      evidenceGetCount: finalizedNetwork.evidenceGetCount,
      optionsCount: finalizedNetwork.optionsCount,
      expectedStaticRequestCount: finalizedNetwork.expectedStaticRequestCount,
      staticRequestCount: finalizedNetwork.staticRequestCount,
      unexpectedRequestCount: finalizedNetwork.unexpectedRequestCount,
      redirectCount: finalizedNetwork.redirectCount,
      retryCount: finalizedNetwork.retryCount,
      failureCount: finalizedNetwork.failureCount,
      strictlyOrdered: finalizedNetwork.strictlyOrdered,
      transcript: structuredClone(finalizedNetwork.transcript),
      transcriptSha256: task51Sha256(
        canonicalTask51Json(finalizedNetwork.transcript)
      ),
    },
  };
  assertTask51NetworkReceipt(receipt);
  return deepFreeze(receipt);
}

export function serializeTask51NetworkReceipt(receipt) {
  assertTask51NetworkReceipt(receipt);
  const receiptSha256 = task51Sha256(receipt);
  return canonicalTask51Json({ receipt, receiptSha256 });
}

export function parseTask51NetworkReceipt(raw) {
  if (typeof raw !== "string" && !(raw instanceof Uint8Array)) {
    throw new Error("TASK51_NETWORK_RECEIPT_BYTES_REJECTED");
  }
  let text;
  try {
    text =
      typeof raw === "string"
        ? raw
        : new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    throw new Error("TASK51_NETWORK_RECEIPT_BYTES_REJECTED");
  }
  if (!/^[\x00-\x7f]*$/.test(text)) {
    throw new Error("TASK51_NETWORK_RECEIPT_BYTES_REJECTED");
  }
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error("TASK51_NETWORK_RECEIPT_JSON_REJECTED");
  }
  assertTask51ReceiptHasNoForbiddenFields(envelope);
  if (!hasExactKeys(envelope, ["receipt", "receiptSha256"])) {
    throw new Error("TASK51_NETWORK_RECEIPT_ENVELOPE_REJECTED");
  }
  assertTask51NetworkReceipt(envelope.receipt);
  if (
    typeof envelope.receiptSha256 !== "string" ||
    !SHA256_PATTERN.test(envelope.receiptSha256) ||
    task51Sha256(envelope.receipt) !== envelope.receiptSha256
  ) {
    throw new Error("TASK51_NETWORK_RECEIPT_HASH_MISMATCH");
  }
  if (canonicalTask51Json(envelope) !== text) {
    throw new Error("TASK51_NETWORK_RECEIPT_NON_CANONICAL");
  }
  return deepFreeze(envelope.receipt);
}
