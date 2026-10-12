import { createHash, randomBytes } from "node:crypto";
import {
  O_CREAT,
  O_EXCL,
  O_NOFOLLOW,
  O_RDONLY,
  O_WRONLY,
} from "node:constants";
import { link, lstat, open, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import {
  TASK51_AUTHENTICATED_READ_CORS_NAMES,
  TASK51_BOOTSTRAP_READ_ALLOWLIST,
} from "./task51-network-attestor-ledger.mjs";

export const TASK51_STAGE_B_CLAIM_URL =
  "https://api.xrteeth.com/v1/task51/stage-b/claim";
export const TASK51_PRODUCTION_ORIGIN = "https://d.xrugc.com";
export const TASK51_WARM_URL = "https://d.xrugc.com/";
export const TASK51_RUNNER_URL =
  "https://d.xrugc.com/internal/task51/memory-isolated-runner";
export const TASK51_AUTH_QUIET_MS = 16 * 60 * 1_000;
export const TASK51_STRICT_WINDOW_TIMEOUT_MS = 30 * 60 * 1_000;

const STAGE_B_MAX_BYTES = 16 * 1_024;
const CLAIM_RECEIPT_MAX_BYTES = 8 * 1_024;
const RUNNER_FRAGMENT_MAX_BYTES = 32 * 1_024;
const CAPABILITY_MAX_BYTES = 4 * 1_024;
const MIN_EXECUTION_REMAINING_MS = 30 * 60 * 1_000 + 15 * 1_000;
const CLOCK_SKEW_MS = 2 * 60 * 1_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const GIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
const APPROVAL_PATTERN =
  /^WP3-TASK51-[A-Z0-9-]*MEMORY-RUNNER[A-Z0-9-]*STAGE-B-[0-9]{8}$/;
const STAGE_A_APPROVAL_PATTERN =
  /^WP3-REL-TASK51-[A-Z0-9-]*MEMORY-RUNNER[A-Z0-9-]*STAGE-A-[0-9]{8}$/;
const EXECUTION_PATTERN = /^task51-stage-b-[a-z0-9-]{8,96}$/;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
const STAGE_B_SCHEMA = "wp3-task51-stage-b-execution-approval-v3";
const CLAIM_RECEIPT_SCHEMA = "wp3-task51-stage-b-global-claim-receipt-v1";
const FRAGMENT_SCHEMA = "wp3-task51-runner-fragment-v3";
const PRODUCTION_DIRECT_MATRIX_SCHEMA =
  "wp3-task51-production-direct-matrix-v1";
const PRODUCTION_DIRECT_MATRIX_CELL_COUNT = 256;
const RUNNER_PROTOCOL = "wp3-task51-memory-runner-v1";
const API_ORIGINS = new Set([
  "https://api.xrteeth.com",
  "https://api.tmrpp.com",
]);
const USER_INFO_URLS = new Set([
  "https://api.xrteeth.com/v1/user/info",
  "https://api.tmrpp.com/v1/user/info",
]);
const LOGIN_URLS = new Set([
  "https://api.xrteeth.com/v1/auth/login",
  "https://api.tmrpp.com/v1/auth/login",
]);

const STAGE_B_KEYS = Object.freeze([
  "approvalRef",
  "authorizedControlPostCount",
  "authorizedLogicalGetCount",
  "authorizedLoginCount",
  "authorizedLogoutCount",
  "claimCapabilitySha256",
  "coordinatorOrigin",
  "coordinatorServerPublishSha",
  "currentWindowOnly",
  "executionId",
  "expiresAt",
  "issuedAt",
  "oneShot",
  "productionDirectMatrixAuthorizedCellCount",
  "productionDirectMatrixEvidenceRef",
  "productionDirectMatrixSchema",
  "productionDirectMatrixSubjectDigest",
  "protocol",
  "schema",
  "stageAApprovalRef",
  "stageACoordinatorServerReleaseEvidenceSha256",
  "stageANetworkAttestorReleaseEvidenceSha256",
  "stageAReleaseEvidenceSha256",
  "status",
]);
const CLAIM_RECEIPT_KEYS = Object.freeze([
  "approvalRef",
  "claimCount",
  "claimedAt",
  "coordinatorOrigin",
  "coordinatorServerPublishSha",
  "executionId",
  "expiresAt",
  "globalExactOneClaimed",
  "schema",
  "stageBExecutionEvidenceSha256",
  "state",
]);
const FRAGMENT_KEYS = Object.freeze([
  "approvalRef",
  "counts",
  "executionId",
  "exportedAt",
  "flags",
  "protocol",
  "productionDirectMatrixEvidenceRef",
  "productionDirectMatrixEvidenceSha256",
  "productionDirectMatrixSubjectDigest",
  "safeCellResults",
  "schema",
  "stageBClaimedAt",
  "stageBExecutionEvidenceSha256",
  "stageBGlobalClaimReceiptSha256",
]);
const COUNT_EXPECTATIONS = Object.freeze({
  baselineCellCount: 24,
  burnedLogicalGetCount: 56,
  captureCount: 4,
  completedLogicalGetCount: 56,
  duplicateCellCount: 0,
  expectedLogicalGetCount: 56,
  failedCellCount: 0,
  maxInFlightGetCount: 1,
  personalDataFindingCount: 0,
  readinessCellCount: 8,
  retryCount: 0,
  shadowCellCount: 24,
  tmrppShadowCellCount: 12,
  unknownCellCount: 0,
  unsafeFieldCount: 0,
  xrteethShadowCellCount: 12,
});
const FLAG_EXPECTATIONS = Object.freeze({
  captureAcceptanceImpliesSuccessfulRevoke: true,
  cleared: true,
  completed: true,
  externalGatesPassedBeforeCapture: true,
  ordinaryUserNegativePassed: true,
  responseMaterialPersisted: false,
  responseMaterialPrintedOrLogged: false,
  rootBreakGlassPassed: true,
  safeOutputOnly: true,
  strictlySerial: true,
  workerReferencesCleared: true,
});
const SAFE_CELL_KEYS = Object.freeze([
  "baselineParityMatched",
  "crossNodeIdentityMatched",
  "expectedDecisionMatched",
  "httpStatus",
  "ledgerKey",
  "node",
  "path",
  "phase",
  "role",
  "roleSubjectDigest",
  "roleExact",
  "schemaPassed",
  "transportPassed",
]);
const ROLES = Object.freeze(["user", "manager", "admin", "root"]);
const NODES = Object.freeze(["xrteeth", "tmrpp"]);
const EVIDENCE_PATHS = Object.freeze([
  "/v1/user/info",
  "/v1/plugin/verify-token",
  "/v1/organization/list",
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isJsonEvidenceRef(value) {
  return typeof value === "string" &&
    value.length <= 256 &&
    /^reports\/[A-Za-z0-9._/-]+\.json$/.test(value) &&
    !value
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..");
}

function isTimestamp(value) {
  if (typeof value !== "string" || !TIMESTAMP_PATTERN.test(value)) return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(
      value
    );
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const offsetHour = match[7] === "Z" ? 0 : Number(match[8]);
  const offsetMinute = match[7] === "Z" ? 0 : Number(match[9]);
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= days[month] &&
    Number(match[4]) <= 23 &&
    Number(match[5]) <= 59 &&
    Number(match[6]) <= 59 &&
    offsetHour <= 14 &&
    offsetMinute <= 59 &&
    (offsetHour < 14 || offsetMinute === 0) &&
    Number.isFinite(Date.parse(value))
  );
}

function canonicalCopy(value) {
  if (Array.isArray(value)) return value.map(canonicalCopy);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalCopy(value[key])])
  );
}

export function canonicalTask51StageBJson(value) {
  const json = JSON.stringify(canonicalCopy(value)).replace(
    /[\u007f-\uffff]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
  return `${json}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseCanonical(raw, code) {
  let text;
  let value;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
    value = JSON.parse(text);
  } catch {
    throw new Error(code);
  }
  if (
    !/^[\x00-\x7f]*$/.test(text) ||
    canonicalTask51StageBJson(value) !== text
  ) {
    throw new Error(code);
  }
  return value;
}

function validateStageB(raw, nowMs) {
  const value = parseCanonical(raw, "TASK51_STAGE_B_ARTIFACT_REJECTED");
  if (
    !hasExactKeys(value, STAGE_B_KEYS) ||
    value.schema !== STAGE_B_SCHEMA ||
    value.protocol !== RUNNER_PROTOCOL ||
    !APPROVAL_PATTERN.test(value.approvalRef) ||
    !EXECUTION_PATTERN.test(value.executionId) ||
    !STAGE_A_APPROVAL_PATTERN.test(value.stageAApprovalRef) ||
    !SHA256_PATTERN.test(value.stageACoordinatorServerReleaseEvidenceSha256) ||
    !SHA256_PATTERN.test(value.stageANetworkAttestorReleaseEvidenceSha256) ||
    !SHA256_PATTERN.test(value.stageAReleaseEvidenceSha256) ||
    !SHA256_PATTERN.test(value.claimCapabilitySha256) ||
    value.coordinatorOrigin !== "https://api.xrteeth.com" ||
    !GIT_SHA_PATTERN.test(value.coordinatorServerPublishSha) ||
    value.status !== "APPROVED" ||
    value.oneShot !== true ||
    value.currentWindowOnly !== true ||
    value.authorizedControlPostCount !== 1 ||
    value.authorizedLoginCount !== 4 ||
    value.authorizedLogoutCount !== 4 ||
    value.authorizedLogicalGetCount !== 56 ||
    value.productionDirectMatrixSchema !== PRODUCTION_DIRECT_MATRIX_SCHEMA ||
    !isJsonEvidenceRef(value.productionDirectMatrixEvidenceRef) ||
    value.productionDirectMatrixAuthorizedCellCount !==
      PRODUCTION_DIRECT_MATRIX_CELL_COUNT ||
    !SHA256_PATTERN.test(value.productionDirectMatrixSubjectDigest) ||
    value.productionDirectMatrixSubjectDigest === "0".repeat(64) ||
    !isTimestamp(value.issuedAt) ||
    !isTimestamp(value.expiresAt)
  ) {
    throw new Error("TASK51_STAGE_B_ARTIFACT_REJECTED");
  }
  const issuedAt = Date.parse(value.issuedAt);
  const expiresAt = Date.parse(value.expiresAt);
  if (
    issuedAt > nowMs ||
    nowMs >= expiresAt ||
    expiresAt - nowMs < MIN_EXECUTION_REMAINING_MS ||
    expiresAt - issuedAt < 35 * 60 * 1_000 ||
    expiresAt - issuedAt > 2 * 60 * 60 * 1_000
  ) {
    throw new Error("TASK51_STAGE_B_ARTIFACT_REJECTED");
  }
  return Object.freeze(value);
}

function validateClaimReceipt(raw, stageB, stageBSha256, nowMs) {
  const value = parseCanonical(raw, "TASK51_STAGE_B_CLAIM_RECEIPT_REJECTED");
  if (
    !hasExactKeys(value, CLAIM_RECEIPT_KEYS) ||
    value.schema !== CLAIM_RECEIPT_SCHEMA ||
    value.approvalRef !== stageB.approvalRef ||
    value.executionId !== stageB.executionId ||
    value.state !== "CLAIMED" ||
    value.globalExactOneClaimed !== true ||
    value.claimCount !== 1 ||
    value.expiresAt !== stageB.expiresAt ||
    value.stageBExecutionEvidenceSha256 !== stageBSha256 ||
    value.coordinatorOrigin !== stageB.coordinatorOrigin ||
    value.coordinatorServerPublishSha !== stageB.coordinatorServerPublishSha ||
    !isTimestamp(value.claimedAt)
  ) {
    throw new Error("TASK51_STAGE_B_CLAIM_RECEIPT_REJECTED");
  }
  const claimedAt = Date.parse(value.claimedAt);
  const expiresAt = Date.parse(value.expiresAt);
  if (
    claimedAt < Date.parse(stageB.issuedAt) ||
    claimedAt > nowMs + CLOCK_SKEW_MS ||
    claimedAt >= expiresAt ||
    nowMs >= expiresAt ||
    expiresAt - nowMs < MIN_EXECUTION_REMAINING_MS
  ) {
    throw new Error("TASK51_STAGE_B_CLAIM_RECEIPT_REJECTED");
  }
  return Object.freeze(value);
}

async function readBoundedRegularFile(path, maximumBytes, dependencies) {
  let handle;
  try {
    handle = await dependencies.open(path, O_RDONLY | O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size <= 0 || stat.size > maximumBytes) {
      throw new Error("TASK51_BOUNDED_FILE_REJECTED");
    }
    const bytes = await handle.readFile();
    if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) {
      bytes.fill(0);
      throw new Error("TASK51_BOUNDED_FILE_REJECTED");
    }
    return { bytes, stat };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("TASK51_")) {
      throw error;
    }
    throw new Error("TASK51_BOUNDED_FILE_REJECTED");
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function assertOutputAbsent(path, dependencies) {
  try {
    await dependencies.lstat(path);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return;
    throw new Error("TASK51_CLAIM_RECEIPT_OUTPUT_REJECTED");
  }
  throw new Error("TASK51_CLAIM_RECEIPT_OUTPUT_REJECTED");
}

function sameFileIdentity(expected, actual) {
  return (
    expected.dev === actual.dev &&
    expected.ino === actual.ino &&
    expected.size === actual.size &&
    expected.mtimeMs === actual.mtimeMs &&
    expected.ctimeMs === actual.ctimeMs &&
    expected.nlink === actual.nlink &&
    expected.uid === actual.uid
  );
}

function isPrivateSingleOwnerFile(stat) {
  const currentUid =
    typeof process.getuid === "function" ? process.getuid() : null;
  return (
    stat.isFile() &&
    stat.nlink === 1 &&
    currentUid !== null &&
    stat.uid === currentUid &&
    (stat.mode & 0o777) === 0o600
  );
}

function assertCapabilityBytes(bytes) {
  if (bytes.byteLength !== 43) {
    throw new Error("TASK51_CLAIM_CAPABILITY_REJECTED");
  }
  let value;
  let decoded;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) {
      throw new Error("TASK51_CLAIM_CAPABILITY_REJECTED");
    }
    decoded = Buffer.from(value, "base64url");
    if (decoded.byteLength !== 32 || decoded.toString("base64url") !== value) {
      throw new Error("TASK51_CLAIM_CAPABILITY_REJECTED");
    }
  } finally {
    decoded?.fill(0);
    value = "";
  }
}

function decodeCapability(bytes) {
  assertCapabilityBytes(bytes);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function assertTask51SignalActive(signal, code) {
  if (signal?.aborted) throw new Error(code);
}

const defaultDependencies = Object.freeze({
  fetch: globalThis.fetch.bind(globalThis),
  link,
  lstat,
  now: () => Date.now(),
  open,
  unlink,
});

/** Durable, no-clobber publication: temp fsync -> atomic link -> dir fsync. */
export async function writeTask51ExclusiveAtomic(path, bytes, overrides = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  if (
    typeof path !== "string" ||
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength === 0
  ) {
    throw new Error("TASK51_ATOMIC_OUTPUT_REJECTED");
  }
  const directory = dirname(path);
  const temporaryPath = join(
    directory,
    `.${basename(path)}.${process.pid}.${randomBytes(16).toString("hex")}.tmp`
  );
  let temporaryHandle;
  let directoryHandle;
  let linked = false;
  try {
    assertTask51SignalActive(
      dependencies.signal,
      "TASK51_ATOMIC_OUTPUT_ABORTED"
    );
    temporaryHandle = await dependencies.open(
      temporaryPath,
      O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW,
      0o600
    );
    await temporaryHandle.writeFile(bytes);
    await temporaryHandle.sync();
    await temporaryHandle.close();
    temporaryHandle = null;

    // link(2) is atomic and refuses to replace an existing final path.
    assertTask51SignalActive(
      dependencies.signal,
      "TASK51_ATOMIC_OUTPUT_ABORTED"
    );
    await dependencies.link(temporaryPath, path);
    linked = true;
    await dependencies.unlink(temporaryPath);

    const published = await dependencies.lstat(path);
    if (
      !isPrivateSingleOwnerFile(published) ||
      published.size !== bytes.byteLength
    ) {
      throw new Error("TASK51_ATOMIC_OUTPUT_REJECTED");
    }
    directoryHandle = await dependencies.open(directory, O_RDONLY | O_NOFOLLOW);
    await directoryHandle.sync();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("TASK51_")) {
      throw error;
    }
    throw new Error(
      linked
        ? "TASK51_ATOMIC_OUTPUT_DURABILITY_UNCERTAIN"
        : "TASK51_ATOMIC_OUTPUT_REJECTED"
    );
  } finally {
    await temporaryHandle?.close().catch(() => {});
    await directoryHandle?.close().catch(() => {});
    await dependencies.unlink(temporaryPath).catch(() => {});
  }
}

export async function prepareTask51StageB(input, overrides = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  if (
    !isRecord(input) ||
    !APPROVAL_PATTERN.test(input.approvalRef) ||
    !EXECUTION_PATTERN.test(input.executionId) ||
    typeof input.stageBArtifactPath !== "string" ||
    typeof input.claimCapabilityFilePath !== "string" ||
    typeof input.claimReceiptOutPath !== "string"
  ) {
    throw new Error("TASK51_STAGE_B_PARAMETERS_REJECTED");
  }

  await assertOutputAbsent(input.claimReceiptOutPath, dependencies);
  const stageBFile = await readBoundedRegularFile(
    input.stageBArtifactPath,
    STAGE_B_MAX_BYTES,
    dependencies
  );
  const capabilityFile = await readBoundedRegularFile(
    input.claimCapabilityFilePath,
    CAPABILITY_MAX_BYTES,
    dependencies
  );
  try {
    const stageB = validateStageB(stageBFile.bytes, dependencies.now());
    const stageBSha256 = sha256(stageBFile.bytes);
    if (
      stageB.approvalRef !== input.approvalRef ||
      stageB.executionId !== input.executionId ||
      !isPrivateSingleOwnerFile(capabilityFile.stat) ||
      sha256(capabilityFile.bytes) !== stageB.claimCapabilitySha256
    ) {
      throw new Error("TASK51_STAGE_B_BINDING_REJECTED");
    }
    assertCapabilityBytes(capabilityFile.bytes);
    return Object.freeze({
      approvalRef: stageB.approvalRef,
      executionId: stageB.executionId,
      productionDirectMatrixEvidenceRef:
        stageB.productionDirectMatrixEvidenceRef,
      productionDirectMatrixSubjectDigest:
        stageB.productionDirectMatrixSubjectDigest,
      stageBExecutionEvidenceSha256: stageBSha256,
      stageBArtifactPath: input.stageBArtifactPath,
      stageBFileIdentity: Object.freeze({
        ctimeMs: stageBFile.stat.ctimeMs,
        dev: stageBFile.stat.dev,
        ino: stageBFile.stat.ino,
        mtimeMs: stageBFile.stat.mtimeMs,
        nlink: stageBFile.stat.nlink,
        size: stageBFile.stat.size,
        uid: stageBFile.stat.uid,
      }),
      claimCapabilityFilePath: input.claimCapabilityFilePath,
      capabilityFileIdentity: Object.freeze({
        ctimeMs: capabilityFile.stat.ctimeMs,
        dev: capabilityFile.stat.dev,
        ino: capabilityFile.stat.ino,
        mtimeMs: capabilityFile.stat.mtimeMs,
        nlink: capabilityFile.stat.nlink,
        size: capabilityFile.stat.size,
        uid: capabilityFile.stat.uid,
      }),
      claimReceiptOutPath: input.claimReceiptOutPath,
      stageB,
    });
  } finally {
    stageBFile.bytes.fill(0);
    capabilityFile.bytes.fill(0);
  }
}

async function readBoundedResponse(response) {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > CLAIM_RECEIPT_MAX_BYTES) {
      bytes.fill(0);
      throw new Error("TASK51_STAGE_B_CLAIM_RESPONSE_TOO_LARGE");
    }
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      length += value.byteLength;
      if (length > CLAIM_RECEIPT_MAX_BYTES) {
        value.fill(0);
        await reader.cancel().catch(() => {});
        throw new Error("TASK51_STAGE_B_CLAIM_RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
    if (length === 0) throw new Error("TASK51_STAGE_B_CLAIM_RESPONSE_REJECTED");
    const result = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
      chunk.fill(0);
    }
    return result;
  } finally {
    for (const chunk of chunks) chunk.fill(0);
    reader.releaseLock();
  }
}

export async function claimPreparedTask51StageB(prepared, overrides = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  if (!isRecord(prepared) || !Object.isFrozen(prepared)) {
    throw new Error("TASK51_STAGE_B_PREPARATION_REJECTED");
  }
  await assertOutputAbsent(prepared.claimReceiptOutPath, dependencies);
  const stageBFile = await readBoundedRegularFile(
    prepared.stageBArtifactPath,
    STAGE_B_MAX_BYTES,
    dependencies
  );
  const capabilityFile = await readBoundedRegularFile(
    prepared.claimCapabilityFilePath,
    CAPABILITY_MAX_BYTES,
    dependencies
  );
  let responseBytes = null;
  let capability = "";
  try {
    assertTask51SignalActive(
      dependencies.signal,
      "TASK51_STAGE_B_CLAIM_ABORTED"
    );
    if (
      !sameFileIdentity(prepared.stageBFileIdentity, stageBFile.stat) ||
      !sameFileIdentity(prepared.capabilityFileIdentity, capabilityFile.stat) ||
      !isPrivateSingleOwnerFile(capabilityFile.stat)
    ) {
      throw new Error("TASK51_STAGE_B_INPUT_CHANGED");
    }
    const nowMs = dependencies.now();
    const stageB = validateStageB(stageBFile.bytes, nowMs);
    const stageBSha256 = sha256(stageBFile.bytes);
    if (
      stageBSha256 !== prepared.stageBExecutionEvidenceSha256 ||
      stageB.approvalRef !== prepared.approvalRef ||
      stageB.executionId !== prepared.executionId ||
      sha256(capabilityFile.bytes) !== stageB.claimCapabilitySha256
    ) {
      throw new Error("TASK51_STAGE_B_INPUT_CHANGED");
    }
    capability = decodeCapability(capabilityFile.bytes);
    let response;
    try {
      response = await dependencies.fetch(TASK51_STAGE_B_CLAIM_URL, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          Origin: TASK51_PRODUCTION_ORIGIN,
          "X-Task51-Claim-Capability": capability,
        },
        body: stageBFile.bytes,
        signal: dependencies.signal,
      });
    } catch {
      throw new Error("TASK51_STAGE_B_CLAIM_NETWORK_REJECTED");
    }
    assertTask51SignalActive(
      dependencies.signal,
      "TASK51_STAGE_B_CLAIM_ABORTED"
    );
    if (response.status !== 200 || response.redirected) {
      throw new Error("TASK51_STAGE_B_CLAIM_HTTP_REJECTED");
    }
    if (
      !/^application\/json(?:\s*;|$)/i.test(
        response.headers.get("content-type") ?? ""
      )
    ) {
      throw new Error("TASK51_STAGE_B_CLAIM_CONTENT_TYPE_REJECTED");
    }
    responseBytes = await readBoundedResponse(response);
    assertTask51SignalActive(
      dependencies.signal,
      "TASK51_STAGE_B_CLAIM_ABORTED"
    );
    const receipt = validateClaimReceipt(
      responseBytes,
      stageB,
      stageBSha256,
      dependencies.now()
    );
    const receiptSha256 = sha256(responseBytes);
    assertTask51SignalActive(
      dependencies.signal,
      "TASK51_STAGE_B_CLAIM_ABORTED"
    );
    await writeTask51ExclusiveAtomic(
      prepared.claimReceiptOutPath,
      responseBytes,
      dependencies
    );
    return Object.freeze({
      approvalRef: receipt.approvalRef,
      claimedAt: receipt.claimedAt,
      executionId: receipt.executionId,
      productionDirectMatrixEvidenceRef:
        stageB.productionDirectMatrixEvidenceRef,
      productionDirectMatrixSubjectDigest:
        stageB.productionDirectMatrixSubjectDigest,
      receipt: Object.freeze({ ...receipt }),
      receiptSha256,
      stageBExecutionEvidenceSha256: stageBSha256,
    });
  } finally {
    capability = "";
    stageBFile.bytes.fill(0);
    capabilityFile.bytes.fill(0);
    responseBytes?.fill(0);
  }
}

function expectedCells() {
  const cells = [];
  const append = (phase, node, role, path) =>
    cells.push({
      ledgerKey: `${phase}|${node}|${role}|${path}`,
      node,
      path,
      phase,
      role,
    });
  for (const node of NODES) {
    for (const role of ROLES)
      append("readiness", node, role, EVIDENCE_PATHS[0]);
  }
  for (const phase of ["baseline", "shadow"]) {
    for (const node of NODES) {
      for (const role of ROLES) {
        for (const path of EVIDENCE_PATHS) append(phase, node, role, path);
      }
    }
  }
  return cells;
}

const EXPECTED_CELLS = Object.freeze(expectedCells());

function validateFragment(raw, bindings) {
  const value = parseCanonical(raw, "TASK51_RUNNER_FRAGMENT_REJECTED");
  if (
    !hasExactKeys(value, FRAGMENT_KEYS) ||
    value.schema !== FRAGMENT_SCHEMA ||
    value.protocol !== RUNNER_PROTOCOL ||
    value.approvalRef !== bindings.approvalRef ||
    value.executionId !== bindings.executionId ||
    value.stageBExecutionEvidenceSha256 !==
      bindings.stageBExecutionEvidenceSha256 ||
    value.stageBGlobalClaimReceiptSha256 !== bindings.receiptSha256 ||
    value.stageBClaimedAt !== bindings.claimedAt ||
    value.productionDirectMatrixEvidenceRef !==
      bindings.productionDirectMatrixEvidenceRef ||
    !isJsonEvidenceRef(value.productionDirectMatrixEvidenceRef) ||
    !SHA256_PATTERN.test(value.productionDirectMatrixEvidenceSha256) ||
    value.productionDirectMatrixEvidenceSha256 === "0".repeat(64) ||
    value.productionDirectMatrixSubjectDigest !==
      bindings.productionDirectMatrixSubjectDigest ||
    !isTimestamp(value.exportedAt) ||
    Date.parse(value.exportedAt) < Date.parse(value.stageBClaimedAt) ||
    Date.parse(value.exportedAt) >= Date.parse(bindings.expiresAt) ||
    !hasExactKeys(value.counts, Object.keys(COUNT_EXPECTATIONS)) ||
    !hasExactKeys(value.flags, Object.keys(FLAG_EXPECTATIONS)) ||
    !Array.isArray(value.safeCellResults) ||
    value.safeCellResults.length !== 56
  ) {
    throw new Error("TASK51_RUNNER_FRAGMENT_REJECTED");
  }
  for (const [key, expected] of Object.entries(COUNT_EXPECTATIONS)) {
    if (value.counts[key] !== expected) {
      throw new Error("TASK51_RUNNER_FRAGMENT_REJECTED");
    }
  }
  for (const [key, expected] of Object.entries(FLAG_EXPECTATIONS)) {
    if (value.flags[key] !== expected) {
      throw new Error("TASK51_RUNNER_FRAGMENT_REJECTED");
    }
  }
  for (let index = 0; index < EXPECTED_CELLS.length; index += 1) {
    const cell = value.safeCellResults[index];
    const expected = EXPECTED_CELLS[index];
    const organizationDenied =
      expected.path === "/v1/organization/list" &&
      (expected.role === "user" || expected.role === "manager");
    const identityBearing = expected.path !== "/v1/organization/list";
    const expectedCrossNode = identityBearing
      ? expected.phase === "readiness" && expected.node === "xrteeth"
        ? null
        : true
      : null;
    if (
      !hasExactKeys(cell, SAFE_CELL_KEYS) ||
      cell.ledgerKey !== expected.ledgerKey ||
      cell.phase !== expected.phase ||
      cell.node !== expected.node ||
      cell.role !== expected.role ||
      !SHA256_PATTERN.test(cell.roleSubjectDigest) ||
      cell.roleSubjectDigest === "0".repeat(64) ||
      cell.path !== expected.path ||
      cell.httpStatus !== (organizationDenied ? 403 : 200) ||
      cell.transportPassed !== true ||
      cell.schemaPassed !== true ||
      cell.expectedDecisionMatched !== true ||
      cell.baselineParityMatched !==
        (expected.phase === "shadow" ? true : null) ||
      cell.roleExact !== (identityBearing ? true : null) ||
      cell.crossNodeIdentityMatched !== expectedCrossNode
    ) {
      throw new Error("TASK51_RUNNER_FRAGMENT_REJECTED");
    }
  }
  const roleSubjectDigests = new Map();
  for (const cell of value.safeCellResults) {
    const first = roleSubjectDigests.get(cell.role);
    if (first === undefined) roleSubjectDigests.set(cell.role, cell.roleSubjectDigest);
    else if (first !== cell.roleSubjectDigest) {
      throw new Error("TASK51_RUNNER_FRAGMENT_REJECTED");
    }
  }
  if (
    roleSubjectDigests.size !== ROLES.length ||
    new Set(roleSubjectDigests.values()).size !== ROLES.length ||
    sha256(
      canonicalTask51StageBJson(
        Object.fromEntries(ROLES.map((role) => [role, roleSubjectDigests.get(role)]))
      )
    ) !== value.productionDirectMatrixSubjectDigest
  ) {
    throw new Error("TASK51_RUNNER_FRAGMENT_REJECTED");
  }
  return Object.freeze(value);
}

export async function readTask51RunnerFragment(path, bindings, overrides = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  const file = await readBoundedRegularFile(
    path,
    RUNNER_FRAGMENT_MAX_BYTES,
    dependencies
  );
  try {
    const value = validateFragment(file.bytes, bindings);
    return Object.freeze({
      approvalRef: value.approvalRef,
      executionId: value.executionId,
      runnerFragmentSha256: sha256(file.bytes),
      productionDirectMatrixEvidenceRef:
        value.productionDirectMatrixEvidenceRef,
      productionDirectMatrixEvidenceSha256:
        value.productionDirectMatrixEvidenceSha256,
      productionDirectMatrixSubjectDigest:
        value.productionDirectMatrixSubjectDigest,
      stageBExecutionEvidenceSha256: value.stageBExecutionEvidenceSha256,
    });
  } finally {
    file.bytes.fill(0);
  }
}

export function createTask51PreArmSupervisor({
  bootstrapReadAllowlist = [],
  staticUrls,
  onViolation = () => {},
} = {}) {
  const allowedStatic = new Set(staticUrls);
  if (
    !Array.isArray(bootstrapReadAllowlist) ||
    bootstrapReadAllowlist.length !== TASK51_BOOTSTRAP_READ_ALLOWLIST.length ||
    bootstrapReadAllowlist.some(
      (url, index) => url !== TASK51_BOOTSTRAP_READ_ALLOWLIST[index]
    )
  ) {
    throw new Error("TASK51_PREARM_BOOTSTRAP_ALLOWLIST_REJECTED");
  }
  const allowedBootstrapReads = new Set();
  for (const value of bootstrapReadAllowlist) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("TASK51_PREARM_BOOTSTRAP_ALLOWLIST_REJECTED");
    }
    if (
      parsed.href !== value ||
      !API_ORIGINS.has(parsed.origin) ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.search !== "" ||
      parsed.hash !== "" ||
      allowedBootstrapReads.has(parsed.href)
    ) {
      throw new Error("TASK51_PREARM_BOOTSTRAP_ALLOWLIST_REJECTED");
    }
    allowedBootstrapReads.add(parsed.href);
  }
  const bootstrapUserInfoUrls = new Set(
    [...allowedBootstrapReads].filter((url) => USER_INFO_URLS.has(url))
  );
  if (bootstrapUserInfoUrls.size !== 1) {
    throw new Error("TASK51_PREARM_BOOTSTRAP_ALLOWLIST_REJECTED");
  }
  let mode = "bootstrap";
  let bootstrapLoginOptionsCount = 0;
  let bootstrapLoginPostCount = 0;
  const bootstrapReadOptions = new Set();
  const bootstrapReads = new Set();
  let transitionUserInfoGetCount = 0;
  let transitionOptionsCount = 0;
  let quietStartedAt = null;
  let unexpectedRequestCount = 0;
  const active = new Map();

  function violate(code) {
    unexpectedRequestCount += 1;
    onViolation(code);
    return Object.freeze({ allowed: false, code });
  }

  function beginRequest(descriptor) {
    if (
      !hasExactKeys(descriptor, [
        "corsRequestHeaderNames",
        "corsRequestMethod",
        "id",
        "method",
        "redirected",
        "resourceType",
        "url",
      ]) ||
      active.has(descriptor.id) ||
      descriptor.redirected === true ||
      (descriptor.method.toUpperCase() !== "OPTIONS" &&
        (descriptor.corsRequestMethod !== null ||
          descriptor.corsRequestHeaderNames !== null))
    ) {
      return violate("TASK51_PREARM_REQUEST_REJECTED");
    }
    const method = descriptor.method.toUpperCase();
    const resourceType = descriptor.resourceType.toLowerCase();
    let parsed;
    try {
      parsed = new URL(descriptor.url);
    } catch {
      return violate("TASK51_PREARM_REQUEST_REJECTED");
    }
    if (resourceType === "websocket" || resourceType === "ping") {
      return violate("TASK51_PREARM_CHANNEL_REJECTED");
    }
    if (
      (method === "GET" || method === "HEAD") &&
      allowedStatic.has(parsed.href)
    ) {
      return Object.freeze({ allowed: true, category: "static" });
    }
    if (!API_ORIGINS.has(parsed.origin)) {
      return violate("TASK51_PREARM_ORIGIN_REJECTED");
    }
    if (mode === "bootstrap") {
      if (
        method === "OPTIONS" &&
        LOGIN_URLS.has(parsed.href) &&
        ["fetch", "other"].includes(resourceType) &&
        descriptor.corsRequestMethod?.toUpperCase() === "POST" &&
        descriptor.corsRequestHeaderNames
          ?.split(",")
          .map((name) => name.trim().toLowerCase())
          .sort()
          .join(",") === "content-type" &&
        bootstrapLoginOptionsCount === 0 &&
        bootstrapLoginPostCount === 0 &&
        active.size === 0
      ) {
        bootstrapLoginOptionsCount += 1;
      } else if (
        method === "POST" &&
        LOGIN_URLS.has(parsed.href) &&
        ["fetch", "xhr"].includes(resourceType) &&
        bootstrapLoginPostCount === 0 &&
        active.size === 0
      ) {
        bootstrapLoginPostCount += 1;
      } else if (
        method === "OPTIONS" &&
        allowedBootstrapReads.has(parsed.href) &&
        ["fetch", "other"].includes(resourceType) &&
        descriptor.corsRequestMethod?.toUpperCase() === "GET" &&
        descriptor.corsRequestHeaderNames
          ?.split(",")
          .map((name) => name.trim().toLowerCase())
          .sort()
          .join(",") === TASK51_AUTHENTICATED_READ_CORS_NAMES &&
        bootstrapLoginPostCount === 1 &&
        parsed.href === TASK51_BOOTSTRAP_READ_ALLOWLIST[bootstrapReads.size] &&
        !bootstrapReadOptions.has(parsed.href) &&
        !bootstrapReads.has(parsed.href) &&
        active.size === 0
      ) {
        bootstrapReadOptions.add(parsed.href);
      } else if (
        method === "GET" &&
        allowedBootstrapReads.has(parsed.href) &&
        ["fetch", "xhr"].includes(resourceType) &&
        bootstrapLoginPostCount === 1 &&
        parsed.href === TASK51_BOOTSTRAP_READ_ALLOWLIST[bootstrapReads.size] &&
        !bootstrapReads.has(parsed.href) &&
        active.size === 0
      ) {
        bootstrapReads.add(parsed.href);
      } else {
        return violate("TASK51_PREARM_BOOTSTRAP_REJECTED");
      }
      active.set(descriptor.id, "bootstrap-api");
      return Object.freeze({ allowed: true, category: "prearm" });
    }
    if (mode === "transition" && bootstrapUserInfoUrls.has(parsed.href)) {
      if (
        method === "GET" &&
        ["fetch", "xhr"].includes(resourceType) &&
        transitionUserInfoGetCount === 0
      ) {
        transitionUserInfoGetCount += 1;
      } else if (
        method === "OPTIONS" &&
        ["fetch", "other"].includes(resourceType) &&
        transitionOptionsCount === 0 &&
        descriptor.corsRequestMethod?.toUpperCase() === "GET" &&
        descriptor.corsRequestHeaderNames
          ?.split(",")
          .map((name) => name.trim().toLowerCase())
          .sort()
          .join(",") === TASK51_AUTHENTICATED_READ_CORS_NAMES
      ) {
        transitionOptionsCount += 1;
      } else {
        return violate("TASK51_PREARM_TRANSITION_REQUEST_REJECTED");
      }
      active.set(descriptor.id, "transition-api");
      return Object.freeze({ allowed: true, category: "prearm" });
    }
    return violate("TASK51_PREARM_QUIET_REQUEST_REJECTED");
  }

  function terminateRequest(id, failed = false) {
    if (!active.has(id)) return violate("TASK51_PREARM_TERMINAL_REJECTED");
    active.delete(id);
    if (failed) return violate("TASK51_PREARM_FAILURE_REJECTED");
    return Object.freeze({ allowed: true, category: "prearm" });
  }

  function enterTransition() {
    if (
      mode !== "bootstrap" ||
      active.size !== 0 ||
      bootstrapLoginPostCount !== 1 ||
      bootstrapReads.size !== allowedBootstrapReads.size
    ) {
      throw new Error("TASK51_PREARM_TRANSITION_GATE_REJECTED");
    }
    mode = "transition";
  }

  function enterQuiet(nowMs) {
    if (
      mode !== "transition" ||
      active.size !== 0 ||
      transitionUserInfoGetCount !== 1
    ) {
      throw new Error("TASK51_PREARM_QUIET_GATE_REJECTED");
    }
    mode = "quiet";
    quietStartedAt = nowMs;
  }

  function assertReadyToClaim(nowMs) {
    if (
      mode !== "quiet" ||
      active.size !== 0 ||
      unexpectedRequestCount !== 0 ||
      quietStartedAt === null ||
      nowMs - quietStartedAt < TASK51_AUTH_QUIET_MS
    ) {
      throw new Error("TASK51_PREARM_CLAIM_GATE_REJECTED");
    }
    mode = "strict";
  }

  function snapshot() {
    return Object.freeze({
      activeRequestCount: active.size,
      bootstrapLoginOptionsCount,
      bootstrapLoginPostCount,
      bootstrapReadCount: bootstrapReads.size,
      bootstrapReadOptionsCount: bootstrapReadOptions.size,
      expectedBootstrapReadCount: allowedBootstrapReads.size,
      mode,
      quietStartedAt,
      transitionOptionsCount,
      transitionUserInfoGetCount,
      unexpectedRequestCount,
    });
  }

  return Object.freeze({
    assertReadyToClaim,
    beginRequest,
    enterQuiet,
    enterTransition,
    finishRequest: (id) => terminateRequest(id, false),
    failRequest: (id) => terminateRequest(id, true),
    snapshot,
  });
}
