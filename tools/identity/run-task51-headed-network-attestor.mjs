#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { O_NOFOLLOW, O_RDONLY } from "node:constants";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { lstat, open } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { createTask51NetworkLedger } from "./task51-network-attestor-ledger.mjs";
import {
  buildTask51NetworkReceipt,
  assertTask51StageBExecutionSourceBindings,
  parseTask51NetworkAttestorReleaseEvidence,
  parseTask51StageBExecutionSources,
  parseTask51HistoricalEvidenceException,
  TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA,
  serializeTask51NetworkReceipt,
  TASK51_MAX_STATIC_RESPONSE_BYTES,
  TASK51_MAX_STATIC_TOTAL_BYTES,
  task51Sha256,
} from "./task51-network-receipt.mjs";
import {
  TASK51_AUTH_QUIET_MS,
  TASK51_RUNNER_URL,
  TASK51_STRICT_WINDOW_TIMEOUT_MS,
  TASK51_WARM_URL,
  claimPreparedTask51StageB,
  createTask51PreArmSupervisor,
  prepareTask51StageB,
  readTask51RunnerFragment,
  writeTask51ExclusiveAtomic,
} from "./task51-stage-b-supervisor.mjs";

function usage() {
  return [
    "Usage:",
    "  node tools/identity/run-task51-headed-network-attestor.mjs \\",
    `    --warm-url ${TASK51_WARM_URL} \\`,
    `    --runner-url ${TASK51_RUNNER_URL} \\`,
    "    --approval-ref <approvalRef> --execution-id <executionId> \\",
    "    --stage-a-attestor-artifact <canonical-attestor-A.json> \\",
    "    --stage-b-artifact <canonical-B-v2.json> \\",
    "    --claim-capability-file <0600-secret-file> \\",
    "    --claim-receipt-out <new-canonical-claim-receipt.json> \\",
    "    --runner-fragment <new-final-F-v2.json> \\",
    "    --receipt-out <new-path> \\",
    "    --execution-sources <canonical-current-sources.json> \\",
    "    --observer-manifest <owner-pinned-manifest.json> \\",
    "    --observer-authorization <production-authorization.json> \\",
    "    --stage-b-readiness <owner-pinned-readiness.json> \\",
    "    --trusted-authorization-anchor <independent-owner-anchor.json> \\",
    "    --evidence-map <existing-artifact-map.json> \\",
    "    --evidence-root <task51-evidence-root> [--evidence-root <historical-root>]",
    "",
    "Stage A remains immutable historical evidence. Current sources and the",
    "independent owner/readiness preflight are mandatory before any browser launch.",
    "For the accepted missing-history route, replace --stage-a-attestor-artifact",
    "with --trusted-history-exception-anchor <accepted-exception-anchor.json>.",
    "The two routes are mutually exclusive; missing current evidence never falls back to history.",
    "Pass only the capability",
    "file path in argv; the capability value is never accepted in argv or env.",
  ].join("\n");
}

export function parseTask51AttestorArguments(argv) {
  const values = {};
  const scalarFlags = new Map([
    ["--warm-url", "warmUrl"],
    ["--runner-url", "runnerUrl"],
    ["--approval-ref", "approvalRef"],
    ["--execution-id", "executionId"],
    ["--stage-a-attestor-artifact", "stageAAttestorArtifactPath"],
    ["--trusted-history-exception-anchor", "trustedHistoryExceptionAnchorPath"],
    ["--stage-b-artifact", "stageBArtifactPath"],
    ["--claim-capability-file", "claimCapabilityFilePath"],
    ["--claim-receipt-out", "claimReceiptOutPath"],
    ["--runner-fragment", "runnerFragmentPath"],
    ["--receipt-out", "receiptOut"],
    ["--execution-sources", "executionSourcesPath"],
    ["--observer-manifest", "observerManifestPath"],
    ["--observer-authorization", "observerAuthorizationPath"],
    ["--stage-b-readiness", "stageBReadinessPath"],
    ["--trusted-authorization-anchor", "trustedAuthorizationAnchorPath"],
    ["--evidence-map", "evidenceMapPath"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") return { help: true };
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}`);
    }
    if (flag === "--evidence-root") {
      (values.evidenceRoots ??= []).push(value);
    } else if (scalarFlags.has(flag)) {
      const key = scalarFlags.get(flag);
      if (values[key] !== undefined) {
        throw new Error(`Duplicate argument: ${flag}`);
      }
      values[key] = value;
    } else throw new Error(`Unknown argument: ${flag}`);
    index += 1;
  }

  for (const key of [
    "warmUrl",
    "runnerUrl",
    "approvalRef",
    "executionId",
    "stageBArtifactPath",
    "claimCapabilityFilePath",
    "claimReceiptOutPath",
    "runnerFragmentPath",
    "receiptOut",
  ]) {
    if (!values[key]) throw new Error(`Missing required argument: ${key}`);
  }
  if (
    Boolean(values.stageAAttestorArtifactPath) ===
    Boolean(values.trustedHistoryExceptionAnchorPath)
  ) {
    throw new Error("TASK51_HISTORY_INPUT_ROUTE_REJECTED");
  }
  const sourceKeys = [
    "executionSourcesPath",
    "observerManifestPath",
    "observerAuthorizationPath",
    "stageBReadinessPath",
    "trustedAuthorizationAnchorPath",
    "evidenceMapPath",
    "evidenceRoots",
  ];
  if (
    sourceKeys.some((key) => values[key] !== undefined) &&
    sourceKeys.some((key) => !values[key])
  ) {
    throw new Error("TASK51_EXECUTION_PREFLIGHT_INPUTS_REJECTED");
  }
  if (
    values.warmUrl !== TASK51_WARM_URL ||
    values.runnerUrl !== TASK51_RUNNER_URL ||
    new Set(
      [
        values.stageAAttestorArtifactPath ??
          values.trustedHistoryExceptionAnchorPath,
        values.stageBArtifactPath,
        values.claimCapabilityFilePath,
        values.claimReceiptOutPath,
        values.runnerFragmentPath,
        values.receiptOut,
      ].map((path) => resolve(path))
    ).size !== 6
  ) {
    throw new Error("TASK51_ATTESTOR_FIXED_URLS_REJECTED");
  }
  return Object.freeze({ ...values });
}

function parsePreflightJson(raw) {
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        typeof raw === "string" ? new TextEncoder().encode(raw) : raw
      )
    );
  } catch {
    throw new Error("TASK51_EXECUTION_PREFLIGHT_JSON_REJECTED");
  }
}

export function createTask51EvidenceMapReader(mapRaw, evidenceRoots) {
  const reject = () => {
    throw new Error("TASK51_EXECUTION_PREFLIGHT_REF_REJECTED");
  };
  if (
    !Array.isArray(evidenceRoots) ||
    evidenceRoots.length < 1 ||
    evidenceRoots.length > 16
  )
    reject();
  const roots = evidenceRoots.map((path) => {
    if (typeof path !== "string") reject();
    const real = realpathSync(path);
    // A task evidence root, not a home/workspace/system directory. Explicit
    // historical sibling roots can be provided without allowing arbitrary FS.
    if (
      !real.split(sep).some((part) => /^task51[-_]/.test(part)) ||
      !lstatSync(real).isDirectory()
    )
      reject();
    return real;
  });
  const map = parsePreflightJson(mapRaw);
  if (
    !map ||
    typeof map !== "object" ||
    Array.isArray(map) ||
    Object.keys(map).length > 8192
  )
    reject();
  return (ref) => {
    if (typeof ref !== "string" || !Object.hasOwn(map, ref)) reject();
    const entry = map[ref];
    if (
      !entry ||
      Object.keys(entry).sort().join(",") !== "byteLength,path,sha256" ||
      typeof entry.path !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !Number.isSafeInteger(entry.byteLength) ||
      entry.byteLength < 1 ||
      entry.byteLength > 64 * 1024 * 1024
    )
      reject();
    const path = resolve(entry.path);
    const root = roots.find((value) => path.startsWith(value + sep));
    if (!root) reject();
    // Every mapped path component must be real, non-symlink and inside its
    // selected root. O_NOFOLLOW also protects the final open from substitution.
    let parent = path;
    while (parent !== root) {
      if (lstatSync(parent).isSymbolicLink() || realpathSync(parent) !== parent)
        reject();
      parent = dirname(parent);
    }
    const bytes = readPreflightFile(path);
    if (
      bytes.length !== entry.byteLength ||
      task51Sha256(bytes) !== entry.sha256
    )
      reject();
    return bytes;
  };
}

function readPreflightFile(path, limit = 64 * 1024 * 1024) {
  let fd;
  try {
    fd = openSync(path, O_RDONLY | O_NOFOLLOW);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size < 1 || stat.size > limit) throw new Error();
    return readFileSync(fd);
  } catch {
    throw new Error("TASK51_EXECUTION_PREFLIGHT_FILE_REJECTED");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

// Independently verify the executing checkout, not merely a caller's declared
// localTool object. The root preflight additionally verifies parent/scope/CI.
export function assertTask51ExecutingToolIdentity(localTool) {
  const root = realpathSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../..")
  );
  const git = (args) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 2 * 1024 * 1024,
    }).trim();
  try {
    if (
      git(["rev-parse", "--verify", "HEAD^{commit}"]) !== localTool.commitSha ||
      git(["rev-parse", "HEAD^{tree}"]) !== localTool.treeSha ||
      git(["symbolic-ref", "--short", "HEAD"]) !== localTool.branch ||
      realpathSync(git(["rev-parse", "--show-toplevel"])) !== root
    )
      throw new Error();
    const entries = localTool.candidateFileManifest.map((path) => {
      const blob = git(["rev-parse", `${localTool.commitSha}:${path}`]);
      const bytes = readPreflightFile(resolve(root, path), 4 * 1024 * 1024);
      if (
        !/^[a-f0-9]{40}$/.test(blob) ||
        createHash("sha1")
          .update(`blob ${bytes.length}\0`)
          .update(bytes)
          .digest("hex") !== blob
      )
        throw new Error();
      return `${path}\0${blob}\n`;
    });
    if (task51Sha256(entries.join("")) !== localTool.candidateContentSha256)
      throw new Error();
  } catch {
    throw new Error("TASK51_EXECUTING_TOOL_IDENTITY_REJECTED");
  }
}

async function prepareExecutionSources(
  options,
  stageAAttestor,
  preparedStageB,
  parsedSources
) {
  const artifactReader = createTask51EvidenceMapReader(
    readPreflightFile(options.evidenceMapPath, 4 * 1024 * 1024),
    options.evidenceRoots
  );
  const exceptionRoute =
    parsedSources.value.schema === TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA;
  let historyException, currentBaseline, trustedHistoryExceptionAnchor;
  if (exceptionRoute) {
    historyException = parseTask51HistoricalEvidenceException(
      artifactReader(parsedSources.value.historyException.evidenceRef)
    );
    const raw = artifactReader(parsedSources.value.currentBaseline.evidenceRef);
    currentBaseline = {
      raw: typeof raw === "string" ? raw : Buffer.from(raw).toString("utf8"),
      sha256: task51Sha256(raw),
    };
    trustedHistoryExceptionAnchor = parsePreflightJson(
      readPreflightFile(options.trustedHistoryExceptionAnchorPath, 64 * 1024)
    );
  }
  const sources = assertTask51StageBExecutionSourceBindings(parsedSources, {
    approvalRef: options.approvalRef,
    executionId: options.executionId,
    historicalStageA: stageAAttestor,
    historyException,
    currentBaseline,
  });
  const manifestRaw = readPreflightFile(options.observerManifestPath);
  const authorizationRaw = readPreflightFile(options.observerAuthorizationPath);
  const readinessRaw = readPreflightFile(options.stageBReadinessPath);
  const stageBRaw = readPreflightFile(options.stageBArtifactPath);
  const anchorRaw = readPreflightFile(
    options.trustedAuthorizationAnchorPath,
    64 * 1024
  );
  const readiness = parsePreflightJson(readinessRaw);
  const manifest = parsePreflightJson(manifestRaw);
  const anchor = parsePreflightJson(anchorRaw);
  if (
    task51Sha256(stageBRaw) !== preparedStageB.stageBExecutionEvidenceSha256 ||
    manifest.executionSources?.evidenceSha256 !== sources.sha256 ||
    manifest.stageBReadiness?.evidenceSha256 !== task51Sha256(readinessRaw) ||
    anchor.manifestBinding?.evidenceSha256 !== task51Sha256(manifestRaw)
  )
    throw new Error("TASK51_EXECUTION_PREFLIGHT_BINDING_REJECTED");
  assertTask51ExecutingToolIdentity(sources.value.localTool);
  const rootValidator = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../tools/identity/validate-role-permission-production-shadow-closeout.mjs"
  );
  const validatorBytes = readPreflightFile(rootValidator, 4 * 1024 * 1024);
  if (
    task51Sha256(validatorBytes) !==
    readiness.policyAttestor?.validatorSourceSha256
  )
    throw new Error("TASK51_EXECUTION_PREFLIGHT_POLICY_REJECTED");
  // The parent policy exists only in the execution checkout, not standalone Web CI.
  // Load its verified bytes at runtime; never resolve it during test collection.
  const validatorDirectoryUrl = pathToFileURL(
    dirname(rootValidator) + sep
  ).href;
  // Keep the .mjs suffix explicit so Vite leaves the CLI hashbang intact.
  const validator = await import(
    /* @vite-ignore */ `${validatorDirectoryUrl}validate-role-permission-production-shadow-closeout.mjs`
  );
  if (
    task51Sha256(readPreflightFile(rootValidator, 4 * 1024 * 1024)) !==
      task51Sha256(validatorBytes) ||
    typeof validator.verifyTask51StageBExecutionPreflight !== "function"
  )
    throw new Error("TASK51_EXECUTION_PREFLIGHT_POLICY_REJECTED");
  const result = await validator.verifyTask51StageBExecutionPreflight({
    executionSourcesRaw: sources.raw,
    stageARaw: stageAAttestor?.raw,
    stageBRaw,
    manifestRaw,
    authorizationRaw,
    readinessRaw,
    artifactReader,
    trustedAuthorizationAnchor: anchor,
    trustedHistoryExceptionAnchor,
  });
  if (
    !result.passed ||
    result.executionSourcesSha256 !== sources.sha256 ||
    result.manifestSha256 !== task51Sha256(manifestRaw)
  )
    throw new Error("TASK51_EXECUTION_PREFLIGHT_REJECTED");
  return sources;
}

export async function createTask51SafeRequestDescriptor(request, id) {
  const method = request.method().toUpperCase();
  // OPTIONS is the sole exception to the no-header-read rule. These two CORS
  // control fields contain header names/method only, never credential values.
  const corsRequestMethod =
    method === "OPTIONS"
      ? await request.headerValue("access-control-request-method")
      : null;
  const corsRequestHeaderNames =
    method === "OPTIONS"
      ? await request.headerValue("access-control-request-headers")
      : null;
  return {
    corsRequestHeaderNames,
    corsRequestMethod,
    id,
    method,
    redirected: request.redirectedFrom() !== null,
    resourceType: request.resourceType(),
    url: request.url(),
  };
}

export function createTask51FailureSignal(onFail = () => {}) {
  let rejectFailure;
  let failed = false;
  const promise = new Promise((_, reject) => {
    rejectFailure = reject;
  });
  promise.catch(() => {});
  return Object.freeze({
    fail(code) {
      if (failed) return;
      failed = true;
      onFail(code);
      rejectFailure(new Error(code));
    },
    race(operation) {
      return Promise.race([operation, promise]);
    },
  });
}

export async function claimTask51StageBWithFailureFence(
  preparedStageB,
  failureSignal,
  controller,
  overrides = {}
) {
  const claimPromise = claimPreparedTask51StageB(preparedStageB, {
    ...overrides,
    signal: controller.signal,
  });
  try {
    return await failureSignal.race(claimPromise);
  } catch (error) {
    controller.abort();
    await claimPromise.catch(() => {});
    throw error;
  }
}

async function assertPathAbsent(path) {
  try {
    await lstat(path);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return;
    throw new Error("TASK51_ATTESTOR_OUTPUT_PATH_REJECTED");
  }
  throw new Error("TASK51_ATTESTOR_OUTPUT_PATH_REJECTED");
}

async function readTask51StageAAttestorArtifact(path) {
  let handle;
  try {
    handle = await open(path, O_RDONLY | O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size <= 0 || stat.size > 64 * 1024) {
      throw new Error("TASK51_STAGE_A_ATTESTOR_FILE_REJECTED");
    }
    const bytes = await handle.readFile();
    try {
      return parseTask51NetworkAttestorReleaseEvidence(bytes);
    } finally {
      bytes.fill(0);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("TASK51_"))
      throw error;
    throw new Error("TASK51_STAGE_A_ATTESTOR_FILE_REJECTED");
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function readTask51FinalFragmentExportedAt(path, expectedSha256) {
  let handle;
  try {
    handle = await open(path, O_RDONLY | O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size <= 0 || stat.size > 32 * 1024) {
      throw new Error("TASK51_FINAL_FRAGMENT_FILE_REJECTED");
    }
    const bytes = await handle.readFile();
    try {
      if (createHash("sha256").update(bytes).digest("hex") !== expectedSha256) {
        throw new Error("TASK51_FINAL_FRAGMENT_TOCTOU_REJECTED");
      }
      const value = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes)
      );
      const exportedAt = value?.exportedAt;
      if (
        typeof exportedAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(exportedAt) ||
        !Number.isFinite(Date.parse(exportedAt)) ||
        new Date(exportedAt).toISOString() !== exportedAt
      ) {
        throw new Error("TASK51_FINAL_FRAGMENT_EXPORTED_AT_REJECTED");
      }
      return exportedAt;
    } finally {
      bytes.fill(0);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("TASK51_"))
      throw error;
    throw new Error("TASK51_FINAL_FRAGMENT_FILE_REJECTED");
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function sha256Task51Executable(path) {
  let handle;
  try {
    handle = await open(path, O_RDONLY | O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size <= 0 || stat.size > 1024 * 1024 * 1024) {
      throw new Error("TASK51_BROWSER_BINARY_REJECTED");
    }
    const digest = createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      digest.update(chunk);
      chunk.fill(0);
    }
    return digest.digest("hex");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("TASK51_"))
      throw error;
    throw new Error("TASK51_BROWSER_BINARY_REJECTED");
  } finally {
    await handle?.close().catch(() => {});
  }
}

export function assertTask51NetworkFinalizationWindow({
  finalizedAt,
  fragmentExportedAt,
  strictDeadlineMs,
}) {
  const finalizedMs = Date.parse(finalizedAt);
  const fragmentExportedMs = Date.parse(fragmentExportedAt);
  if (
    !Number.isFinite(finalizedMs) ||
    !Number.isFinite(fragmentExportedMs) ||
    !Number.isSafeInteger(strictDeadlineMs) ||
    fragmentExportedMs > finalizedMs ||
    finalizedMs >= strictDeadlineMs
  ) {
    throw new Error("TASK51_NETWORK_FINALIZED_AT_REJECTED");
  }
}

export function assertTask51StageAAttestorStageBBinding(
  stageAAttestor,
  stageB
) {
  if (
    stageB.stageANetworkAttestorReleaseEvidenceSha256 !==
      stageAAttestor.sha256 ||
    stageB.stageAApprovalRef !== stageAAttestor.value.approvalRef ||
    stageB.stageAReleaseEvidenceSha256 !==
      stageAAttestor.value.webStageAReleaseEvidenceSha256
  ) {
    throw new Error("TASK51_STAGE_A_ATTESTOR_STAGE_B_BINDING_REJECTED");
  }
}

export function task51RunnerFragmentBindings(preparedStageB, claim) {
  if (
    typeof preparedStageB.productionDirectMatrixEvidenceRef !== "string" ||
    !/^reports\/[A-Za-z0-9._/-]+\.json$/.test(
      preparedStageB.productionDirectMatrixEvidenceRef
    ) ||
    preparedStageB.productionDirectMatrixEvidenceRef
      .split("/")
      .some((part) => part === "." || part === "..") ||
    !/^[a-f0-9]{64}$/.test(preparedStageB.productionDirectMatrixSubjectDigest)
  )
    throw new Error("TASK51_RUNNER_FRAGMENT_BINDINGS_REJECTED");
  return Object.freeze({
    approvalRef: preparedStageB.approvalRef,
    claimedAt: claim.claimedAt,
    executionId: preparedStageB.executionId,
    expiresAt: preparedStageB.stageB.expiresAt,
    productionDirectMatrixEvidenceRef:
      preparedStageB.productionDirectMatrixEvidenceRef,
    productionDirectMatrixSubjectDigest:
      preparedStageB.productionDirectMatrixSubjectDigest,
    receiptSha256: claim.receiptSha256,
    stageBExecutionEvidenceSha256: preparedStageB.stageBExecutionEvidenceSha256,
  });
}

async function waitForBrowserIdle(
  supervisor,
  ledger,
  failureSignal,
  timeoutMs = 30_000
) {
  const startedAt = Date.now();
  while (
    supervisor.snapshot().activeRequestCount !== 0 ||
    ledger.snapshot().activeRequestCount !== 0
  ) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error("TASK51_PREARM_IDLE_TIMEOUT");
    }
    await failureSignal.race(new Promise((resolve) => setTimeout(resolve, 25)));
  }
}

async function pushTask51RunnerThroughVueRouter(page, failureSignal) {
  await failureSignal.race(
    page.evaluate(async (path) => {
      const root = document.querySelector("#app");
      const vueApp = root?.__vue_app__;
      const router = vueApp?.config?.globalProperties?.$router;
      if (!router || typeof router.push !== "function") {
        throw new Error("TASK51_VUE_ROUTER_UNAVAILABLE");
      }
      await router.push(path);
      if (typeof router.isReady === "function") await router.isReady();
    }, new URL(TASK51_RUNNER_URL).pathname)
  );
  await failureSignal.race(
    page.waitForURL(TASK51_RUNNER_URL, { timeout: 60_000 })
  );
  await failureSignal.race(
    page.locator("#task51-memory-runner").waitFor({
      state: "attached",
      timeout: 60_000,
    })
  );
}

export async function runTask51HeadedNetworkAttestor(options, overrides = {}) {
  if (
    [
      "executionSourcesPath",
      "observerManifestPath",
      "observerAuthorizationPath",
      "stageBReadinessPath",
      "trustedAuthorizationAnchorPath",
      "evidenceMapPath",
    ].some((key) => typeof options[key] !== "string" || !options[key]) ||
    !Array.isArray(options.evidenceRoots) ||
    !options.evidenceRoots.length
  ) {
    throw new Error("TASK51_EXECUTION_PREFLIGHT_INPUTS_REJECTED");
  }
  await assertPathAbsent(options.receiptOut);
  await assertPathAbsent(options.runnerFragmentPath);
  const parsedSources = parseTask51StageBExecutionSources(
    readPreflightFile(options.executionSourcesPath, 512 * 1024)
  );
  const exceptionRoute =
    parsedSources.value.schema === TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA;
  if (
    exceptionRoute
      ? !options.trustedHistoryExceptionAnchorPath ||
        options.stageAAttestorArtifactPath
      : !options.stageAAttestorArtifactPath ||
        options.trustedHistoryExceptionAnchorPath
  ) {
    throw new Error("TASK51_HISTORY_INPUT_ROUTE_REJECTED");
  }
  const stageAAttestor = exceptionRoute
    ? null
    : await readTask51StageAAttestorArtifact(
        options.stageAAttestorArtifactPath
      );
  const attestorRelease = stageAAttestor?.value.networkAttestorRelease;
  const preparedStageB = await prepareTask51StageB(
    {
      approvalRef: options.approvalRef,
      claimCapabilityFilePath: options.claimCapabilityFilePath,
      claimReceiptOutPath: options.claimReceiptOutPath,
      executionId: options.executionId,
      stageBArtifactPath: options.stageBArtifactPath,
    },
    overrides.stageBDependencies
  );
  if (!exceptionRoute)
    assertTask51StageAAttestorStageBBinding(
      stageAAttestor,
      preparedStageB.stageB
    );
  // This runs before launch, login/prewarm, quiet and the single-use claim.
  // Source declarations alone never grant the new prewarm request budget.
  const executionSources = await prepareExecutionSources(
    options,
    stageAAttestor,
    preparedStageB,
    parsedSources
  );
  // This field remains an approved historical identity reference, NOT a claim
  // that the missing artifact was loaded or replayed. executionSourcesSha256
  // binds the receipt to the explicit exception and current baseline instead.
  const historicalAttestorSha256 =
    stageAAttestor?.sha256 ??
    preparedStageB.stageB.stageANetworkAttestorReleaseEvidenceSha256;
  const current = executionSources?.value ?? null;
  const provenance =
    current?.currentWeb.networkProvenance ?? attestorRelease.networkProvenance;
  const staticUrls = Object.freeze([...provenance.staticUrlManifest]);

  let activeClaimController = null;
  const failureSignal = createTask51FailureSignal(() => {
    activeClaimController?.abort();
  });
  const failAttestor = (code) => failureSignal.fail(code);
  const preClaimDeadlineMs =
    Date.parse(preparedStageB.stageB.expiresAt) -
    (30 * 60 * 1_000 + 15 * 1_000);
  const preClaimTimeout = setTimeout(
    () => failAttestor("TASK51_PRECLAIM_TOTAL_DEADLINE"),
    Math.max(0, preClaimDeadlineMs - Date.now())
  );
  // Browser hashing/launch can fail before the main lifecycle finally block.
  // Never let the safety deadline timer alone keep that failed process alive.
  preClaimTimeout.unref?.();
  let firstViolation = null;
  const onViolation = (code) => {
    firstViolation ??= code;
    failAttestor(`TASK51_NETWORK_VIOLATION:${code}`);
  };
  const ledger = createTask51NetworkLedger({
    runnerUrl: options.runnerUrl,
    staticUrls,
    onViolation,
    currentSources: current !== null,
    staticRequestCounts:
      current?.currentWeb.networkProvenance.staticRequestCounts ?? null,
  });
  const preArm = createTask51PreArmSupervisor({
    bootstrapReadAllowlist: provenance.bootstrapReadAllowlist,
    staticUrls,
    onViolation,
    prewarmContract: current?.prewarm ?? null,
  });
  const browserType = overrides.chromium ?? chromium;
  const expectedBrowser = current?.browser ?? attestorRelease.browser;
  const browserBinaryPath =
    overrides.observeBrowserRelease === undefined
      ? browserType.executablePath()
      : null;
  const browserBinaryShaBefore =
    browserBinaryPath === null
      ? null
      : await sha256Task51Executable(browserBinaryPath);
  const browserLaunchOptions = Object.freeze({ headless: false });
  const browser = await browserType.launch(browserLaunchOptions);
  let observedBrowserRelease;
  try {
    observedBrowserRelease =
      overrides.observeBrowserRelease === undefined
        ? {
            binarySha256: await sha256Task51Executable(browserBinaryPath),
            channel: "chromium",
            version: browser.version(),
          }
        : await overrides.observeBrowserRelease(browser);
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
  if (
    (browserBinaryShaBefore !== null &&
      browserBinaryShaBefore !== observedBrowserRelease.binarySha256) ||
    observedBrowserRelease.channel !== expectedBrowser.channel ||
    observedBrowserRelease.version !== expectedBrowser.version ||
    observedBrowserRelease.binarySha256 !== expectedBrowser.binarySha256
  ) {
    await browser.close().catch(() => {});
    throw new Error("TASK51_BROWSER_RELEASE_BINDING_REJECTED");
  }
  let context;
  let prompt;
  let intentionalLifecycleClose = false;
  let browserClosed = false;

  try {
    context = await browser.newContext({
      acceptDownloads: false,
      serviceWorkers: "block",
    });
    context.on("close", () => {
      if (!intentionalLifecycleClose) {
        failAttestor("TASK51_CONTEXT_CLOSED");
      }
    });
    browser.on("disconnected", () => {
      if (!intentionalLifecycleClose) {
        failAttestor("TASK51_BROWSER_DISCONNECTED");
      }
    });

    // Route and lifecycle guards are installed before the one permitted page.
    let page = null;
    let pageCount = 0;
    let requestSequence = 0;
    let initialDocumentPending = true;
    const admittedDocumentUrls = new Set();
    let downloadCount = 0;
    let popupCount = 0;
    let serviceWorkerCount = 0;
    let webSocketCount = 0;
    let webSocketRouteInstalled = false;
    let staticResponseBytes = 0;
    const terminalTasks = new Set();
    const requestOwners = new WeakMap();
    const expectedStaticResponses = new Map(
      provenance.staticResponses.map((response) => [response.url, response])
    );

    await context.exposeBinding(
      "__task51RecordForbiddenChannel",
      (_source, channel) => {
        ledger.recordForbiddenChannel(channel);
      }
    );
    await context.addInitScript(() => {
      const report = (channel) => {
        void globalThis.__task51RecordForbiddenChannel(channel);
        throw new Error(`TASK51_FORBIDDEN_CHANNEL:${channel}`);
      };
      const replaceConstructor = (name, channel) => {
        if (!(name in globalThis)) return;
        Object.defineProperty(globalThis, name, {
          configurable: false,
          enumerable: false,
          value: function Task51ForbiddenChannel() {
            return report(channel);
          },
          writable: false,
        });
      };
      replaceConstructor("WebSocket", "websocket");
      replaceConstructor("EventSource", "websocket");
      replaceConstructor("WebTransport", "websocket");
      replaceConstructor("RTCPeerConnection", "websocket");
      replaceConstructor("webkitRTCPeerConnection", "websocket");
      replaceConstructor("SharedWorker", "service-worker");
      Object.defineProperty(globalThis, "open", {
        configurable: false,
        value: () => report("popup"),
        writable: false,
      });
      if (typeof navigator.sendBeacon === "function") {
        Object.defineProperty(navigator, "sendBeacon", {
          configurable: false,
          value: () => report("beacon"),
          writable: false,
        });
      }
      const createElement = document.createElement.bind(document);
      document.createElement = (name, options) => {
        if (String(name).toLowerCase() === "iframe") return report("iframe");
        return createElement(name, options);
      };
    });
    await context.routeWebSocket("**/*", async (webSocketRoute) => {
      webSocketCount += 1;
      ledger.recordForbiddenChannel("websocket");
      await webSocketRoute.close({ code: 1008, reason: "Task 5.1 blocked" });
    });
    webSocketRouteInstalled = true;

    context.on("page", async (createdPage) => {
      pageCount += 1;
      if (pageCount > 1) {
        popupCount += 1;
        ledger.recordForbiddenChannel("popup");
        await createdPage.close().catch(() => {});
      }
    });
    context.on("serviceworker", () => {
      serviceWorkerCount += 1;
      ledger.recordForbiddenChannel("service-worker");
    });
    context.on("requestfinished", (request) => {
      const owner = requestOwners.get(request);
      if (!owner) return;
      requestOwners.delete(request);
      const task = (async () => {
        const response = await request.response();
        if (!response) throw new Error("TASK51_NETWORK_RESPONSE_MISSING");
        if (owner.kind !== "ledger") {
          preArm.finishRequest(owner.id, { httpStatus: response.status() });
          return;
        }
        let contentSha256 = null;
        if (owner.category === "static") {
          const responseBytes = await response.body();
          try {
            const expected = expectedStaticResponses.get(request.url());
            staticResponseBytes += responseBytes.byteLength;
            contentSha256 = createHash("sha256")
              .update(responseBytes)
              .digest("hex");
            if (
              !expected ||
              responseBytes.byteLength > TASK51_MAX_STATIC_RESPONSE_BYTES ||
              staticResponseBytes > TASK51_MAX_STATIC_TOTAL_BYTES ||
              responseBytes.byteLength !== expected.byteLength ||
              contentSha256 !== expected.contentSha256
            ) {
              throw new Error("TASK51_STATIC_RESPONSE_PROVENANCE_REJECTED");
            }
          } finally {
            responseBytes.fill(0);
          }
        }
        ledger.finishRequest(owner.id, {
          byteLength:
            owner.category === "static"
              ? expectedStaticResponses.get(request.url()).byteLength
              : null,
          contentSha256,
          httpStatus: response.status(),
        });
      })()
        .catch(() => onViolation("TASK51_NETWORK_RESPONSE_METADATA_REJECTED"))
        .finally(() => terminalTasks.delete(task));
      terminalTasks.add(task);
    });
    context.on("requestfailed", (request) => {
      const owner = requestOwners.get(request);
      if (!owner) return;
      requestOwners.delete(request);
      if (owner.kind === "ledger") ledger.failRequest(owner.id);
      else preArm.failRequest(owner.id);
    });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const resourceType = request.resourceType().toLowerCase();
      if (
        resourceType === "document" &&
        page !== null &&
        request.frame() !== page.mainFrame()
      ) {
        ledger.recordForbiddenChannel("iframe");
        await route.abort("blockedbyclient");
        return;
      }
      const allowedDocument =
        current !== null
          ? preArm.snapshot().mode === "bootstrap" &&
            current.prewarm.documentUrls.includes(request.url()) &&
            !admittedDocumentUrls.has(request.url())
          : initialDocumentPending;
      if (resourceType === "document" && !allowedDocument) {
        ledger.recordForbiddenChannel("navigation");
        await route.abort("blockedbyclient");
        return;
      }
      if (resourceType === "websocket") {
        ledger.recordForbiddenChannel("websocket");
        await route.abort("blockedbyclient");
        return;
      }
      if (resourceType === "ping") {
        ledger.recordForbiddenChannel("beacon");
        await route.abort("blockedbyclient");
        return;
      }

      requestSequence += 1;
      const id = `request-${requestSequence}`;
      let descriptor;
      try {
        descriptor = await createTask51SafeRequestDescriptor(request, id);
      } catch {
        onViolation("TASK51_SAFE_CORS_METADATA_READ_REJECTED");
        await route.abort("blockedbyclient");
        return;
      }
      const strict = preArm.snapshot().mode === "strict";
      const preArmDecision = strict ? null : preArm.beginRequest(descriptor);
      let decision = preArmDecision;
      let ownerKind = "prearm";
      if (strict || preArmDecision?.category === "static") {
        decision = ledger.beginRequest(descriptor);
        ownerKind = "ledger";
      }
      if (!decision?.allowed) {
        await route.abort("blockedbyclient");
        return;
      }
      requestOwners.set(request, {
        category: decision.category,
        id,
        kind: ownerKind,
      });
      if (resourceType === "document") admittedDocumentUrls.add(request.url());
      await route.continue();
    });

    page = await context.newPage();
    page.on("close", () => {
      if (intentionalLifecycleClose) return;
      failAttestor("TASK51_PAGE_CLOSED");
    });
    page.on("crash", () => {
      failAttestor("TASK51_PAGE_CRASHED");
    });
    page.on("pageerror", () => {
      failAttestor("TASK51_PAGE_ERROR");
    });
    page.on("frameattached", (frame) => {
      if (frame.parentFrame() !== null) ledger.recordForbiddenChannel("iframe");
    });
    page.on("download", async (download) => {
      downloadCount += 1;
      ledger.recordForbiddenChannel("download");
      await download.cancel().catch(() => {});
    });
    page.on("popup", async (popup) => {
      popupCount += 1;
      await popup.close().catch(() => {});
    });
    page.on("websocket", () => {
      webSocketCount += 1;
      ledger.recordForbiddenChannel("websocket");
    });

    await failureSignal.race(
      page.goto(options.warmUrl, { waitUntil: "load", timeout: 60_000 })
    );
    initialDocumentPending = false;
    prompt = createInterface({ input: stdin, output: stdout });
    const ask = overrides.ask ?? ((question) => prompt.question(question));
    await failureSignal.race(
      ask(
        "Log in manually as root through the visible approved login flow; return to the warm SPA, then press Enter here: "
      )
    );
    await waitForBrowserIdle(preArm, ledger, failureSignal);

    preArm.enterTransition();
    await pushTask51RunnerThroughVueRouter(page, failureSignal);
    await waitForBrowserIdle(preArm, ledger, failureSignal);
    preArm.enterQuiet(Date.now());
    stdout.write(
      `Runner loaded. Enforcing ${TASK51_AUTH_QUIET_MS / 60_000} minutes of API-silent auth quiet before consuming Stage B.\n`
    );
    await failureSignal.race(
      new Promise((resolve) => setTimeout(resolve, TASK51_AUTH_QUIET_MS))
    );
    preArm.assertReadyToClaim(Date.now());
    if (ledger.snapshot().activeRequestCount !== 0) {
      throw new Error("TASK51_PREARM_CLAIM_GATE_REJECTED");
    }

    const claimController = new AbortController();
    activeClaimController = claimController;
    let claim;
    try {
      claim = await claimTask51StageBWithFailureFence(
        preparedStageB,
        failureSignal,
        claimController,
        overrides.stageBDependencies
      );
    } finally {
      if (activeClaimController === claimController) {
        activeClaimController = null;
      }
    }
    clearTimeout(preClaimTimeout);
    if (page.url() !== options.runnerUrl) {
      throw new Error("TASK51_NETWORK_RUNNER_NAVIGATION_MISMATCH");
    }
    ledger.arm(page.url());
    const strictDeadlineMs = Math.min(
      Date.parse(claim.claimedAt) + TASK51_STRICT_WINDOW_TIMEOUT_MS,
      Date.parse(preparedStageB.stageB.expiresAt) - 15_000
    );
    if (Date.now() >= strictDeadlineMs) {
      throw new Error("TASK51_STRICT_WINDOW_DEADLINE_REJECTED");
    }
    stdout.write(
      `Global Stage B claim receipt written to ${options.claimReceiptOutPath}. Load B and this receipt into the runner now.\n`
    );

    let strictTimeout;
    const strictTimeoutPromise = new Promise((_, reject) => {
      strictTimeout = setTimeout(
        () => reject(new Error("TASK51_STRICT_WINDOW_TIMEOUT")),
        strictDeadlineMs - Date.now()
      );
    });
    try {
      await failureSignal.race(
        Promise.race([
          ask(
            "Complete capture/export to the exact --runner-fragment path, then press Enter: "
          ),
          strictTimeoutPromise,
        ])
      );
    } finally {
      clearTimeout(strictTimeout);
    }
    await waitForBrowserIdle(preArm, ledger, failureSignal);
    await failureSignal.race(Promise.all([...terminalTasks]));
    if (firstViolation) {
      throw new Error(`TASK51_NETWORK_VIOLATION:${firstViolation}`);
    }

    const finalizedNetwork = ledger.finalize();
    const fragment = await failureSignal.race(
      readTask51RunnerFragment(
        options.runnerFragmentPath,
        task51RunnerFragmentBindings(preparedStageB, claim),
        overrides.stageBDependencies
      )
    );
    const fragmentExportedAt = await readTask51FinalFragmentExportedAt(
      options.runnerFragmentPath,
      fragment.runnerFragmentSha256
    );
    // No receipt is published while any browser-owned execution surface is
    // alive. Closing first also drains late request/websocket events.
    prompt?.close();
    prompt = null;
    intentionalLifecycleClose = true;
    await page.close({ runBeforeUnload: false });
    await context.close();
    context = null;
    await browser.close();
    browserClosed = true;
    await new Promise((resolve) => setImmediate(resolve));
    if (
      firstViolation ||
      ledger.snapshot().activeRequestCount !== 0 ||
      ledger.snapshot().unexpectedRequestCount !== 0 ||
      terminalTasks.size !== 0 ||
      Date.now() >= strictDeadlineMs
    ) {
      throw new Error(
        firstViolation
          ? `TASK51_NETWORK_VIOLATION:${firstViolation}`
          : "TASK51_POST_CLOSE_GATE_REJECTED"
      );
    }
    const finalizedAt = new Date().toISOString();
    assertTask51NetworkFinalizationWindow({
      finalizedAt,
      fragmentExportedAt,
      strictDeadlineMs,
    });
    const observedFlags = {
      ephemeralContext: intentionalLifecycleClose && browserClosed,
      headedBrowser: browserLaunchOptions.headless === false,
      noDownloads: downloadCount === 0,
      noPopups: popupCount === 0 && pageCount === 1,
      noServiceWorkers: serviceWorkerCount === 0,
      noWebSockets: webSocketCount === 0 && webSocketRouteInstalled,
      singlePage: pageCount === 1,
      strictWindowArmed: finalizedNetwork.armed === true,
    };
    const receipt = buildTask51NetworkReceipt(
      {
        approvalRef: preparedStageB.approvalRef,
        ...(current
          ? {
              executionSourcesSha256: executionSources.sha256,
              staticRequestCounts: provenance.staticRequestCounts,
            }
          : {}),
        attestor: current
          ? {
              candidateContentSha256: current.localTool.candidateContentSha256,
              commitSha: current.localTool.commitSha,
              treeSha: current.localTool.treeSha,
              branch: current.localTool.branch,
              releaseEvidenceSha256: historicalAttestorSha256,
            }
          : {
              candidateContentSha256: attestorRelease.candidateContentSha256,
              publishCommitSha: attestorRelease.publishCommitSha,
              publishTreeSha: attestorRelease.publishTreeSha,
              releaseEvidenceSha256: historicalAttestorSha256,
            },
        browserRelease: observedBrowserRelease,
        executionId: preparedStageB.executionId,
        finalizedAt,
        runnerFragmentSha256: fragment.runnerFragmentSha256,
        servedRelease: {
          assetManifestSha256: provenance.servedAssetManifestSha256,
          entrySha256: provenance.servedEntrySha256,
          imageDigest: provenance.servedWebImageDigest,
          ociRevision: provenance.servedWebOciRevision,
        },
        stageANetworkAttestorReleaseEvidenceSha256: historicalAttestorSha256,
        stageBExecutionEvidenceSha256:
          preparedStageB.stageBExecutionEvidenceSha256,
        staticUrlManifestSha256: provenance.staticUrlManifestSha256,
        staticUrls,
        webReleaseSha: provenance.servedWebRevision,
      },
      finalizedNetwork,
      observedFlags
    );
    await writeTask51ExclusiveAtomic(
      options.receiptOut,
      new TextEncoder().encode(serializeTask51NetworkReceipt(receipt))
    );
    stdout.write(`Safe network receipt written to ${options.receiptOut}\n`);
    return receipt;
  } finally {
    clearTimeout(preClaimTimeout);
    prompt?.close();
    await context?.close().catch(() => {});
    if (!browserClosed) await browser.close().catch(() => {});
  }
}

async function main() {
  let options;
  try {
    options = parseTask51AttestorArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    stdout.write(`${usage()}\n`);
    return;
  }
  await runTask51HeadedNetworkAttestor(options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Task 5.1 attestor failed"}\n`
    );
    process.exitCode = 1;
  });
}
