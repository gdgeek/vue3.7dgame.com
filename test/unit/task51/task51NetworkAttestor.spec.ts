import { mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  TASK51_BOOTSTRAP_READ_ALLOWLIST,
  TASK51_BUSINESS_LEDGER,
  TASK51_EXPECTED_BUSINESS_REQUEST_COUNT,
  TASK51_NETWORK_CONSTANTS,
  createTask51NetworkLedger,
  validateTask51StaticAllowlist,
} from "../../../tools/identity/task51-network-attestor-ledger.mjs";
import {
  buildTask51NetworkReceipt,
  assertTask51StageBExecutionSourceBindings,
  canonicalTask51Json,
  parseTask51NetworkAttestorReleaseEvidence,
  parseTask51NetworkReceipt,
  parseTask51StageBExecutionSources,
  parseTask51HistoricalEvidenceException,
  TASK51_HISTORY_EXCEPTION_SCHEMA,
  TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA,
  TASK51_DOCKER_LOAD_PUBLICATION_FORMAT,
  task51StageBPublishedDigest,
  TASK51_MISSING_HISTORY_DIGESTS,
  serializeTask51NetworkReceipt,
  task51Sha256,
  task51StaticResponseManifestSha256,
  task51StaticUrlManifestSha256,
} from "../../../tools/identity/task51-network-receipt.mjs";
import { TASK51_RUNNER_URL } from "../../../tools/identity/task51-stage-b-supervisor.mjs";
import * as supervisorModule from "../../../tools/identity/task51-stage-b-supervisor.mjs";
import {
  assertTask51ExecutingToolIdentity,
  createTask51EvidenceMapReader,
  createTask51SafeRequestDescriptor,
  runTask51HeadedNetworkAttestor,
  parseTask51AttestorArguments,
  task51RunnerFragmentBindings,
} from "../../../tools/identity/run-task51-headed-network-attestor.mjs";

const RUNNER_URL = "https://d.xrugc.com/internal/task51/memory-isolated-runner";
const STATIC_URL = "https://d.xrugc.com/assets/task51-fixed.js";
const ROOT_URL = "https://d.xrugc.com/";
const STATIC_URLS = Object.freeze([ROOT_URL, STATIC_URL]);
const STATIC_BODY_SHA = "d".repeat(64);
const ROOT_BODY_SHA = "e".repeat(64);
const FLAGS = Object.freeze({
  ephemeralContext: true,
  headedBrowser: true,
  noDownloads: true,
  noPopups: true,
  noServiceWorkers: true,
  noWebSockets: true,
  singlePage: true,
  strictWindowArmed: true,
});

function createLedger(onViolation = vi.fn()) {
  return {
    ledger: createTask51NetworkLedger({
      runnerUrl: RUNNER_URL,
      staticUrls: [...STATIC_URLS],
      onViolation,
    }),
    onViolation,
  };
}

function staticMetadata(url: string) {
  return {
    byteLength: url === ROOT_URL ? 100 : 200,
    contentSha256: url === ROOT_URL ? ROOT_BODY_SHA : STATIC_BODY_SHA,
    httpStatus: 200,
  };
}

function businessMetadata(expected: (typeof TASK51_BUSINESS_LEDGER)[number]) {
  return {
    byteLength: null,
    contentSha256: null,
    httpStatus:
      expected.kind === "evidence-get" &&
      expected.path === "/v1/organization/list" &&
      (expected.role === "user" || expected.role === "manager")
        ? 403
        : 200,
  };
}

const OPTIONS_METADATA = Object.freeze({
  byteLength: null,
  contentSha256: null,
  httpStatus: 204,
});

function descriptor(
  id: string,
  method: string,
  url: string,
  resourceType = "fetch",
  redirected = false,
  corsRequestMethod: string | null = null,
  corsRequestHeaderNames: string | null = null
) {
  return {
    corsRequestHeaderNames,
    corsRequestMethod,
    id,
    method,
    url,
    resourceType,
    redirected,
  };
}

function optionsDescriptor(
  id: string,
  expected: (typeof TASK51_BUSINESS_LEDGER)[number],
  overrides: Readonly<{
    url?: string;
    corsRequestMethod?: string;
    corsRequestHeaderNames?: string;
    resourceType?: string;
  }> = {}
) {
  const corsRequestHeaderNames =
    expected.kind === "login-post"
      ? "content-type"
      : expected.kind === "logout-post"
        ? "authorization,content-type"
        : "authorization";
  return descriptor(
    id,
    "OPTIONS",
    overrides.url ?? expected.url,
    overrides.resourceType ?? "fetch",
    false,
    overrides.corsRequestMethod ?? expected.method,
    overrides.corsRequestHeaderNames ?? corsRequestHeaderNames
  );
}

function completeBusinessLedger(
  ledger: ReturnType<typeof createTask51NetworkLedger>
) {
  TASK51_BUSINESS_LEDGER.forEach((expected, index) => {
    const id = `business-${index}`;
    expect(
      ledger.beginRequest(
        descriptor(id, expected.method, expected.url, "fetch")
      )
    ).toMatchObject({ allowed: true, category: "business" });
    expect(ledger.finishRequest(id, businessMetadata(expected))).toMatchObject({
      allowed: true,
    });
  });
}

function completedNetwork(staticRequestUrls: readonly string[] = STATIC_URLS) {
  const { ledger } = createLedger();
  staticRequestUrls.forEach((url, index) => {
    const staticAsset = descriptor(`static-${index}`, "GET", url, "script");
    expect(ledger.beginRequest(staticAsset).allowed).toBe(true);
    expect(
      ledger.finishRequest(staticAsset.id, staticMetadata(url)).allowed
    ).toBe(true);
  });
  ledger.arm(RUNNER_URL);
  const preflight = optionsDescriptor("options-1", TASK51_BUSINESS_LEDGER[0]);
  expect(ledger.beginRequest(preflight).allowed).toBe(true);
  expect(ledger.finishRequest(preflight.id, OPTIONS_METADATA).allowed).toBe(
    true
  );
  completeBusinessLedger(ledger);
  return ledger.finalize();
}

function bindingsFor(network: ReturnType<typeof completedNetwork>) {
  const staticByUrl = new Map(
    network.transcript
      .filter((entry) => entry.category === "static")
      .map((entry) => [entry.url, entry])
  );
  const staticResponses = STATIC_URLS.map((url) => {
    const { byteLength, contentSha256 } = staticByUrl.get(url)!;
    return {
      byteLength,
      contentSha256,
      url,
    };
  });
  return {
    approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-20260828",
    attestor: {
      candidateContentSha256: "1".repeat(64),
      publishCommitSha: "b".repeat(40),
      publishTreeSha: "2".repeat(40),
      releaseEvidenceSha256: "f".repeat(64),
    },
    browserRelease: {
      binarySha256: "3".repeat(64),
      channel: "chromium",
      version: "140.0.7339.16",
    },
    executionId: "task51-stage-b-execution-0001",
    finalizedAt: "2026-08-28T02:00:00.000Z",
    runnerFragmentSha256: "c".repeat(64),
    servedRelease: {
      assetManifestSha256: task51StaticResponseManifestSha256(staticResponses),
      entrySha256: ROOT_BODY_SHA,
      imageDigest: `sha256:${"4".repeat(64)}`,
      ociRevision: "b".repeat(40),
    },
    stageANetworkAttestorReleaseEvidenceSha256: "f".repeat(64),
    stageBExecutionEvidenceSha256: "a".repeat(64),
    staticUrlManifestSha256: task51StaticUrlManifestSha256([...STATIC_URLS]),
    staticUrls: [...STATIC_URLS],
    webReleaseSha: "b".repeat(40),
  };
}

function buildCompletedReceipt() {
  const network = completedNetwork();
  return buildTask51NetworkReceipt(bindingsFor(network), network, FLAGS);
}

function stageAAttestorArtifact() {
  const staticResponses = [
    { byteLength: 100, contentSha256: ROOT_BODY_SHA, url: ROOT_URL },
    { byteLength: 200, contentSha256: STATIC_BODY_SHA, url: STATIC_URL },
  ];
  const value = {
    approvalRef: "WP3-REL-TASK51-MEMORY-RUNNER-STAGE-A-20260828",
    completedAt: "2026-08-28T01:00:00.000Z",
    networkAttestorRelease: {
      browser: {
        binarySha256: "3".repeat(64),
        channel: "chromium",
        evidenceRef: "reports/task51-browser.json",
        headed: true,
        pinned: true,
        serviceWorkersBlocked: true,
        version: "140.0.7339.16",
        webSocketsBlocked: true,
      },
      candidateContentHashAlgorithm: "sha256-path-nul-git-blob-sha-v1",
      candidateContentSha256: "1".repeat(64),
      candidateFileCount: 6,
      candidateFileManifest: [
        "tools/identity/task51-network-attestor-ledger.mjs",
        "tools/identity/task51-network-receipt.mjs",
        "tools/identity/run-task51-headed-network-attestor.mjs",
        "tools/identity/task51-stage-b-supervisor.mjs",
        "test/unit/task51/task51NetworkAttestor.spec.ts",
        "test/unit/task51/task51StageBSupervisor.spec.ts",
      ],
      ciCompletedAt: "2026-08-28T00:30:00.000Z",
      ciHeadSha: "b".repeat(40),
      ciPassed: true,
      ciRunId: 1,
      ciTreeSha: "2".repeat(40),
      cleanCheckoutImportSmokeAt: "2026-08-28T00:40:00.000Z",
      cleanCheckoutImportSmokePassed: true,
      developCandidateContentSha256: "1".repeat(64),
      developCandidateTreeSha: "2".repeat(40),
      developCommitSha: "6".repeat(40),
      developTreeSha: "2".repeat(40),
      evidenceRef: "reports/task51-attestor.json",
      mainCandidateContentSha256: "1".repeat(64),
      mainCandidateTreeSha: "2".repeat(40),
      mainCommitSha: "7".repeat(40),
      mainTreeSha: "2".repeat(40),
      networkProvenance: {
        bootstrapReadAllowlist: [...TASK51_BOOTSTRAP_READ_ALLOWLIST],
        evidenceRef: "reports/task51-provenance.json",
        productionOrigin: "https://d.xrugc.com",
        receiptSchema: "wp3-task51-safe-network-receipt-v2",
        releaseProvenanceExact: true,
        runnerRoute: "/internal/task51/memory-isolated-runner",
        servedAssetManifestHashAlgorithm:
          "sha256-canonical-static-response-manifest-v1",
        servedAssetManifestSha256:
          task51StaticResponseManifestSha256(staticResponses),
        servedEntrySha256: ROOT_BODY_SHA,
        servedWebImageDigest: `sha256:${"4".repeat(64)}`,
        servedWebOciRevision: "b".repeat(40),
        servedWebRevision: "b".repeat(40),
        staticResponses,
        staticUrlManifest: [...STATIC_URLS],
        staticUrlManifestHashAlgorithm: "sha256-lf-utf8-url-list-v1",
        staticUrlManifestSha256: task51StaticUrlManifestSha256([
          ...STATIC_URLS,
        ]),
      },
      nodeVersion: "v22.18.0",
      nonForcePromotions: true,
      playwrightVersion: "1.55.0",
      publishCandidateContentSha256: "1".repeat(64),
      publishCandidateTreeSha: "2".repeat(40),
      publishCommitSha: "b".repeat(40),
      publishTreeSha: "2".repeat(40),
    },
    schema: "wp3-task51-stage-a-network-attestor-release-evidence-v1",
    status: "PASS",
    webStageAReleaseEvidenceSha256: "9".repeat(64),
  };
  return `${canonicalTask51Json(value)}\n`;
}

function executionSourcesFixture() {
  const a = JSON.parse(stageAAttestorArtifact());
  const binding = (name: string) => ({
    evidenceRef: `reports/${name}.json`,
    evidenceSha256: "a".repeat(64),
  });
  const ci = (name: string) => ({
    ciRunId: 1,
    ciRunAttempt: 1,
    ciJobId: 2,
    ciCompletedAt: "2026-09-11T00:00:00.000Z",
    runTranscript: binding(`${name}-run`),
    jobsTranscript: binding(`${name}-jobs`),
    jobLog: binding(`${name}-log`),
  });
  const prewarm = {
    warmUrl: ROOT_URL,
    documentUrls: [ROOT_URL],
    loginUrl: "https://xrugc.com/api-auth/v1/auth/login",
    oidc: null,
    bootstrapReads: [
      {
        url: "https://api.xrteeth.com/v1/user/info",
        minimumCount: 1,
        maximumCount: 2,
      },
    ],
    transitionUserInfoUrl: "https://api.xrteeth.com/v1/user/info",
  };
  const urls = [
    ROOT_URL,
    STATIC_URL,
    "https://d.xrugc.com/__env.js?v=1789108461",
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
  ];
  const responses = urls
    .map((url) => ({ url, ...staticMetadata(url) }))
    .map(({ httpStatus: _status, ...rest }) => rest);
  const provenance = {
    ...a.networkAttestorRelease.networkProvenance,
    receiptSchema: "wp3-task51-safe-network-receipt-v3",
    servedWebRevision: "c".repeat(40),
    servedWebOciRevision: "c".repeat(40),
    bootstrapReadAllowlist: prewarm.bootstrapReads.map(({ url }) => url),
    staticUrlManifest: urls,
    staticUrlManifestSha256: task51StaticUrlManifestSha256(urls),
    staticResponses: responses,
    servedAssetManifestSha256: task51StaticResponseManifestSha256(responses),
    staticRequestCounts: urls.map((url) => ({
      url,
      count: url === STATIC_URL ? 4 : 1,
    })),
  };
  const observers = ["xrteeth", "tmrpp"].map((node) => ({
    node,
    frontdoorOrigin: `https://d.${node}.com`,
    frontendUrl: `https://d.${node}.com/`,
    pluginManifestUrl: `https://d.${node}.com/plugin.json`,
  }));
  const publicUrls = [
    ...new Set([
      ...urls,
      ...observers.flatMap((entry) => [
        entry.frontendUrl,
        entry.pluginManifestUrl,
      ]),
    ]),
  ];
  return {
    schema: "wp3-task51-stage-b-execution-sources-v1",
    approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-20260911",
    executionId: "task51-stage-b-offline-sources-20260911",
    generatedAt: "2026-09-11T01:00:00.000Z",
    historicalStageAFreezeSha256:
      "271a6e540bb26d6c320c2cdd6a7c4222384bcfeff797e85e93007ae150f43ce3",
    historicalStageANetworkAttestor: {
      ...binding("historical-a"),
      evidenceSha256: task51Sha256(stageAAttestorArtifact()),
    },
    currentWeb: {
      repository: "gdgeek/vue3.7dgame.com",
      develop: {
        ...ci("develop"),
        branch: "develop",
        commitSha: "d".repeat(40),
        treeSha: "e".repeat(40),
        indexDigest: `sha256:${"2".repeat(64)}`,
        configDigest: `sha256:${"3".repeat(64)}`,
        commitTranscript: binding("develop-commit"),
      },
      publish: {
        ...ci("publish"),
        branch: "publish",
        commitSha: "c".repeat(40),
        treeSha: "f".repeat(40),
        indexDigest: provenance.servedWebImageDigest,
        configDigest: `sha256:${"5".repeat(64)}`,
        commitTranscript: binding("publish-commit"),
      },
      networkProvenance: provenance,
    },
    localTool: {
      ...ci("tool"),
      repository: "gdgeek/vue3.7dgame.com",
      branch: "codex/task51-offline-test",
      commitSha: "1".repeat(40),
      treeSha: "2".repeat(40),
      candidateContentHashAlgorithm: "sha256-path-nul-git-blob-sha-v1",
      candidateContentSha256: "3".repeat(64),
      candidateFileManifest: a.networkAttestorRelease.candidateFileManifest,
    },
    browser: {
      channel: "chromium",
      version: "143.0.7499.4",
      binarySha256: "4".repeat(64),
    },
    prewarm,
    publicSources: publicUrls.map((url, index) => ({
      url,
      ...binding(`public-${index}`),
    })),
    observerSources: observers,
  };
}

function rawSources(value = executionSourcesFixture()) {
  return `${canonicalTask51Json(value)}\n`;
}

describe("Task 5.1 current docker-load publication identity", () => {
  const fixture = () => {
    const { historicalStageANetworkAttestor: _old, ...value } =
      executionSourcesFixture();
    const current: any = {
      ...value,
      schema: TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA,
      historyException: {
        evidenceRef: "reports/exception.json",
        evidenceSha256: "a".repeat(64),
      },
      currentBaseline: {
        evidenceRef: "reports/baseline.json",
        evidenceSha256: "b".repeat(64),
      },
    };
    for (const branch of ["develop", "publish"]) {
      const release = current.currentWeb[branch];
      release.publication = {
        format: TASK51_DOCKER_LOAD_PUBLICATION_FORMAT,
        exportedManifestDigest: `sha256:${"9".repeat(64)}`,
        pushedDigest: release.indexDigest,
      };
      delete release.indexDigest;
    }
    return current;
  };
  it("preserves separate exported and pushed identities without claiming an index", () => {
    const value = fixture();
    const parsed = parseTask51StageBExecutionSources(rawSources(value));
    expect(parsed.value).toEqual(value);
    const release = parsed.value.currentWeb.publish;
    expect(task51StageBPublishedDigest(release)).toBe(
      value.currentWeb.networkProvenance.servedWebImageDigest
    );
    expect(release.indexDigest).toBeUndefined();
    expect(release.publication.exportedManifestDigest).not.toBe(
      release.publication.pushedDigest
    );
    // The unchanged historical shape remains accepted on its original route.
    expect(parseTask51StageBExecutionSources(rawSources()).value.schema).toBe(
      "wp3-task51-stage-b-execution-sources-v1"
    );
  });
  it.each([
    "index-alias",
    "wrong-format",
    "missing-export",
    "missing-push",
    "config-as-push",
    "config-as-export",
    "wrong-served",
    "mixed-branches",
    "media-type-claim",
    "null-publication",
    "historical-route",
  ])("rejects %s without fallback to legacy identity", (fault) => {
    const v = fixture(),
      r = v.currentWeb.publish;
    if (fault === "index-alias") r.indexDigest = r.publication.pushedDigest;
    if (fault === "wrong-format") r.publication.format = "anything";
    if (fault === "missing-export") delete r.publication.exportedManifestDigest;
    if (fault === "missing-push") delete r.publication.pushedDigest;
    if (fault === "config-as-push") r.publication.pushedDigest = r.configDigest;
    if (fault === "config-as-export")
      r.publication.exportedManifestDigest = r.configDigest;
    if (fault === "wrong-served")
      v.currentWeb.networkProvenance.servedWebImageDigest =
        r.publication.exportedManifestDigest;
    if (fault === "mixed-branches") {
      v.currentWeb.develop.indexDigest =
        v.currentWeb.develop.publication.pushedDigest;
      delete v.currentWeb.develop.publication;
    }
    if (fault === "media-type-claim") r.publication.mediaTypeObserved = true;
    if (fault === "null-publication") r.publication = null;
    if (fault === "historical-route") {
      v.schema = "wp3-task51-stage-b-execution-sources-v1";
      v.historicalStageANetworkAttestor =
        executionSourcesFixture().historicalStageANetworkAttestor;
      delete v.historyException;
      delete v.currentBaseline;
    }
    expect(() => parseTask51StageBExecutionSources(rawSources(v))).toThrow(
      "TASK51_EXECUTION_SOURCES_REJECTED"
    );
  });
});

describe("Task 5.1 accepted missing history is not historical replay", () => {
  const cliBase = [
    "--warm-url",
    supervisorModule.TASK51_WARM_URL,
    "--runner-url",
    RUNNER_URL,
    "--approval-ref",
    "WP3-TASK51-MEMORY-RUNNER-STAGE-B-20260920",
    "--execution-id",
    "task51-stage-b-test-exception",
    "--stage-b-artifact",
    "/test-only/b.json",
    "--claim-capability-file",
    "/test-only/capability",
    "--claim-receipt-out",
    "/test-only/claim.json",
    "--runner-fragment",
    "/test-only/f.json",
    "--receipt-out",
    "/test-only/n.json",
  ];
  it("accepts an explicit exception route without a historical artifact path", () => {
    const options = parseTask51AttestorArguments([
      ...cliBase,
      "--trusted-history-exception-anchor",
      "/test-only/exception-anchor.json",
    ]);
    expect(options.stageAAttestorArtifactPath).toBeUndefined();
    expect(options.trustedHistoryExceptionAnchorPath).toBe(
      "/test-only/exception-anchor.json"
    );
  });
  it("rejects ambiguous or missing history routes instead of guessing", () => {
    expect(() => parseTask51AttestorArguments(cliBase)).toThrow(
      "TASK51_HISTORY_INPUT_ROUTE_REJECTED"
    );
    expect(() =>
      parseTask51AttestorArguments([
        ...cliBase,
        "--trusted-history-exception-anchor",
        "/test-only/exception-anchor.json",
        "--stage-a-attestor-artifact",
        "/test-only/a.json",
      ])
    ).toThrow("TASK51_HISTORY_INPUT_ROUTE_REJECTED");
  });
  const fixture = () => ({
    schema: TASK51_HISTORY_EXCEPTION_SCHEMA,
    exceptionId: "WP3-TASK51-HISTORY-EXCEPTION-20260920-TEST",
    issuedAt: "2026-09-20T08:00:00.000Z",
    scope: "HISTORICAL_STAGE_A_EVIDENCE_ONLY",
    decision: "OWNER_ACCEPTS_MISSING_ORIGINALS",
    missingOriginals: { ...TASK51_MISSING_HISTORY_DIGESTS },
    historicalReleaseRefSha: "ca799deb9658149b4202e845567510fef165ce31",
    historicalEvidenceAvailable: false,
    historicalReplayPassed: false,
    originalsReconstructed: false,
    currentBaselineRequired: true,
    productionAuthorized: false,
    cleanupAuthorized: false,
  });
  it("parses the exception without requiring lost files or another conversation proof", () => {
    const raw = `${canonicalTask51Json(fixture())}\n`;
    expect(parseTask51HistoricalEvidenceException(raw)).toEqual({
      raw,
      value: fixture(),
      sha256: task51Sha256(raw),
    });
  });
  it.each([
    "historicalEvidenceAvailable",
    "historicalReplayPassed",
    "originalsReconstructed",
    "productionAuthorized",
    "cleanupAuthorized",
  ])("rejects an exception claiming %s", (key) => {
    expect(() =>
      parseTask51HistoricalEvidenceException(
        `${canonicalTask51Json({ ...fixture(), [key]: true })}\n`
      )
    ).toThrow("TASK51_HISTORY_EXCEPTION_REJECTED");
  });
  it("cannot waive current safety or silently select different history", () => {
    for (const value of [
      { ...fixture(), currentBaselineRequired: false },
      {
        ...fixture(),
        missingOriginals: {
          ...TASK51_MISSING_HISTORY_DIGESTS,
          freeze: "0".repeat(64),
        },
      },
      { ...fixture(), passed: true },
      { ...fixture(), scope: "ALL_TASK51_EVIDENCE" },
      { ...fixture(), decision: "HISTORICAL_REPLAY_PASS" },
    ])
      expect(() =>
        parseTask51HistoricalEvidenceException(
          `${canonicalTask51Json(value)}\n`
        )
      ).toThrow("TASK51_HISTORY_EXCEPTION_REJECTED");
  });
  it("binds current sources without accessing historical attestor bytes", () => {
    const exception = parseTask51HistoricalEvidenceException(
      `${canonicalTask51Json(fixture())}\n`
    );
    // Structural fixture only: this is deliberately NOT a verified baseline.
    const baselineRaw = `${canonicalTask51Json({ schema: "wp3-task51-stage-b-current-baseline-v1" })}\n`;
    const baseline = { raw: baselineRaw, sha256: task51Sha256(baselineRaw) };
    const { historicalStageANetworkAttestor: old, ...existing } =
      executionSourcesFixture();
    const value = {
      ...existing,
      schema: TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA,
      historicalStageAFreezeSha256: TASK51_MISSING_HISTORY_DIGESTS.freeze,
      historyException: {
        evidenceRef: "reports/history-exception.json",
        evidenceSha256: exception.sha256,
      },
      currentBaseline: {
        evidenceRef: "reports/current-baseline.json",
        evidenceSha256: baseline.sha256,
      },
    };
    const parsed = parseTask51StageBExecutionSources(
      `${canonicalTask51Json(value)}\n`
    );
    // Do not supply even an accessor for the historical argument: the caller
    // has no obligation to load it. A throwing raw getter detects regressions.
    const noHistory = { raw: undefined };
    Object.defineProperty(noHistory, "raw", {
      get() {
        throw new Error("OLD_HISTORY_MUST_NOT_BE_READ");
      },
    });
    expect(
      assertTask51StageBExecutionSourceBindings(parsed, {
        approvalRef: value.approvalRef,
        executionId: value.executionId,
        historyException: exception,
        currentBaseline: baseline,
        historicalStageA: noHistory,
      }).sha256
    ).toBe(parsed.sha256);
    for (const changed of [
      { historyException: undefined, currentBaseline: baseline },
      { historyException: exception, currentBaseline: undefined },
      {
        historyException: { ...exception, sha256: "0".repeat(64) },
        currentBaseline: baseline,
      },
      {
        historyException: exception,
        currentBaseline: { ...baseline, raw: `${baseline.raw} ` },
      },
    ])
      expect(() =>
        assertTask51StageBExecutionSourceBindings(parsed, {
          approvalRef: value.approvalRef,
          executionId: value.executionId,
          ...changed,
        })
      ).toThrow("TASK51_EXECUTION_SOURCE_BINDING_REJECTED");
    for (const changed of [
      { ...value, historicalStageANetworkAttestor: old },
      { ...value, currentBaseline: value.historyException },
      { ...value, historicalStageAFreezeSha256: "0".repeat(64) },
    ])
      expect(() =>
        parseTask51StageBExecutionSources(`${canonicalTask51Json(changed)}\n`)
      ).toThrow("TASK51_EXECUTION_SOURCES_REJECTED");
  });
});

describe("Task 5.1 current execution sources (offline only)", () => {
  it("keeps current served Web, tool checkout and historical A identities distinct", () => {
    const parsed = parseTask51StageBExecutionSources(rawSources());
    expect(
      assertTask51StageBExecutionSourceBindings(parsed, {
        approvalRef: parsed.value.approvalRef,
        executionId: parsed.value.executionId,
        historicalStageA: parseTask51NetworkAttestorReleaseEvidence(
          stageAAttestorArtifact()
        ),
      }).sha256
    ).toBe(parsed.sha256);
    expect(parsed.value.currentWeb.publish.commitSha).not.toBe(
      parsed.value.localTool.commitSha
    );
    expect(() =>
      assertTask51StageBExecutionSourceBindings(parsed, {
        approvalRef: parsed.value.approvalRef,
        executionId: parsed.value.executionId,
        historicalStageA: {
          ...parseTask51NetworkAttestorReleaseEvidence(
            stageAAttestorArtifact()
          ),
          sha256: "0".repeat(64),
        },
      })
    ).toThrow();
    expect(() =>
      assertTask51ExecutingToolIdentity(parsed.value.localTool)
    ).toThrow("TASK51_EXECUTING_TOOL_IDENTITY_REJECTED");
  });
  it("preserves exact query and CDN URLs without generalizing origins", () => {
    const source = executionSourcesFixture();
    const urls = source.currentWeb.networkProvenance.staticUrlManifest;
    expect([
      ...validateTask51StaticAllowlist(RUNNER_URL, urls, {
        currentSources: true,
      }),
    ]).toEqual(urls);
    expect(() => validateTask51StaticAllowlist(RUNNER_URL, urls)).toThrow();
    for (const url of [
      "https://d.xrugc.com/__env.js?token=private",
      "https://d.xrugc.com/__env.js?v=1&v=2",
      "https://d.xrugc.com/__env.js#x",
      "https://appleid.cdn-apple.com/api-auth/v1/auth/login",
    ]) {
      expect(() =>
        validateTask51StaticAllowlist(RUNNER_URL, [ROOT_URL, url], {
          currentSources: true,
        })
      ).toThrow();
    }
    const ledger = createTask51NetworkLedger({
      runnerUrl: RUNNER_URL,
      staticUrls: urls,
      currentSources: true,
      staticRequestCounts:
        source.currentWeb.networkProvenance.staticRequestCounts,
    });
    expect(
      ledger.beginRequest(
        descriptor(
          "wrong-query",
          "GET",
          "https://d.xrugc.com/__env.js?v=1789108462",
          "script"
        )
      ).allowed
    ).toBe(false);
  });
  it.each([
    "missing",
    "null",
    "zero",
    "over-limit",
    "duplicate",
    "config-as-index",
    "wrong-branch",
    "missing-public-source",
    "wrong-historical",
  ])("rejects %s source binding/count faults", (fault) => {
    const value = executionSourcesFixture();
    const p = value.currentWeb.networkProvenance;
    if (fault === "missing") delete p.staticRequestCounts;
    if (fault === "null") p.staticRequestCounts = null;
    if (fault === "zero") p.staticRequestCounts[1].count = 0;
    if (fault === "over-limit") p.staticRequestCounts[1].count = 17;
    if (fault === "duplicate") p.staticRequestCounts[1].url = ROOT_URL;
    if (fault === "config-as-index")
      value.currentWeb.publish.configDigest =
        value.currentWeb.publish.indexDigest;
    if (fault === "wrong-branch") value.currentWeb.publish.branch = "develop";
    if (fault === "missing-public-source") value.publicSources.shift();
    if (fault === "wrong-historical")
      value.historicalStageANetworkAttestor.evidenceSha256 = "0".repeat(64);
    expect(() => {
      const parsed = parseTask51StageBExecutionSources(rawSources(value));
      assertTask51StageBExecutionSourceBindings(parsed, {
        approvalRef: value.approvalRef,
        executionId: value.executionId,
        historicalStageA: parseTask51NetworkAttestorReleaseEvidence(
          stageAAttestorArtifact()
        ),
      });
    }).toThrow();
  });
  it("reads only pinned map entries within explicit evidence roots, including binary historical evidence", async () => {
    const directory = await realpath(
      await mkdtemp(join(tmpdir(), "task51-evidence-map-test-"))
    );
    try {
      const path = join(directory, "source.bin");
      const body = Buffer.from([0, 1, 2, 255]);
      await writeFile(path, body);
      const map = {
        "git:web:historical-key": {
          path,
          sha256: task51Sha256(body),
          byteLength: body.length,
        },
      };
      const reader = createTask51EvidenceMapReader(JSON.stringify(map), [
        directory,
      ]);
      expect(() =>
        createTask51EvidenceMapReader("invalid-private-input", [directory])
      ).toThrow("TASK51_EXECUTION_PREFLIGHT_JSON_REJECTED");
      expect(reader("git:web:historical-key")).toEqual(body);
      expect(() => reader("/etc/passwd")).toThrow();
      const bad = {
        x: { ...map["git:web:historical-key"], path: "/etc/passwd" },
      };
      expect(() =>
        createTask51EvidenceMapReader(JSON.stringify(bad), [directory])("x")
      ).toThrow();
      await symlink(path, join(directory, "linked.bin"));
      const linked = {
        x: {
          ...map["git:web:historical-key"],
          path: join(directory, "linked.bin"),
        },
      };
      expect(() =>
        createTask51EvidenceMapReader(JSON.stringify(linked), [directory])("x")
      ).toThrow();
      await writeFile(path, Buffer.from([9, 9, 9, 9]));
      expect(() => reader("git:web:historical-key")).toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("Task 5.1 current static repeated loads and receipt v3", () => {
  function currentReceipt() {
    const urls = [...STATIC_URLS];
    const counts = urls.map((url) => ({
      url,
      count: url === STATIC_URL ? 4 : 1,
    }));
    const ledger = createTask51NetworkLedger({
      runnerUrl: RUNNER_URL,
      staticUrls: urls,
      currentSources: true,
      staticRequestCounts: counts,
    });
    let serial = 0;
    for (const { url, count } of counts)
      for (let i = 0; i < count; i++) {
        const id = `load-${++serial}`;
        expect(
          ledger.beginRequest(descriptor(id, "GET", url, "script")).allowed
        ).toBe(true);
        expect(ledger.finishRequest(id, staticMetadata(url)).allowed).toBe(
          true
        );
      }
    ledger.arm(RUNNER_URL);
    completeBusinessLedger(ledger);
    const network = ledger.finalize();
    const old = bindingsFor(network);
    return buildTask51NetworkReceipt(
      {
        ...old,
        executionSourcesSha256: "a".repeat(64),
        staticRequestCounts: counts,
        attestor: {
          candidateContentSha256: "1".repeat(64),
          commitSha: "c".repeat(40),
          treeSha: "2".repeat(40),
          branch: "codex/task51-test",
          releaseEvidenceSha256: "f".repeat(64),
        },
      },
      network,
      FLAGS
    );
  }
  it("records four actual successful Worker loads, no retry, and the first response sequence", () => {
    const receipt = currentReceipt();
    expect(receipt.network.staticRequestCount).toBe(5);
    expect(receipt.network.retryCount).toBe(0);
    expect(receipt.staticUrlManifest.responses[1].sequence).toBe(2);
    expect(
      parseTask51NetworkReceipt(serializeTask51NetworkReceipt(receipt)).schema
    ).toBe("wp3-task51-safe-network-receipt-v3");
  });
  it.each([
    "first-sequence",
    "different-bytes",
    "missing-count",
    "null-count",
    "wrong-count",
  ])("rejects %s rather than hiding duplicate observations", (fault) => {
    const value = structuredClone(currentReceipt());
    if (fault === "first-sequence")
      value.staticUrlManifest.responses[1].sequence = 5;
    if (fault === "different-bytes")
      value.network.transcript[3].contentSha256 = "1".repeat(64);
    if (fault === "missing-count") delete value.staticUrlManifest.requestCounts;
    if (fault === "null-count") value.staticUrlManifest.requestCounts = null;
    if (fault === "wrong-count")
      value.staticUrlManifest.requestCounts[1].count = 3;
    value.network.transcriptSha256 = task51Sha256(
      canonicalTask51Json(value.network.transcript)
    );
    expect(() => serializeTask51NetworkReceipt(value)).toThrow();
  });
});

describe("Task 5.1 source-bound prewarm (offline request descriptors only)", () => {
  it("admits the exact Identity/OIDC flow with bounded reads, then retains the 16 minute quiet gate", () => {
    const contract = executionSourcesFixture().prewarm;
    contract.oidc = {
      authorizeUrl: "https://xrugc.com/api-auth/authorize",
      tokenUrl: "https://xrugc.com/api-auth/token",
      clientId: "task51-test",
      redirectUri: "https://d.xrugc.com/auth/callback",
      scope: "openid profile",
    };
    const supervisor = supervisorModule.createTask51PreArmSupervisor({
      staticUrls: [...STATIC_URLS],
      prewarmContract: contract,
    });
    let id = 0;
    const complete = (method: string, url: string) => {
      const request = descriptor(`warm-${++id}`, method, url, "xhr");
      expect(supervisor.beginRequest(request).allowed).toBe(true);
      expect(
        supervisor.finishRequest(request.id, { httpStatus: 200 }).allowed
      ).toBe(true);
    };
    complete("POST", contract.loginUrl);
    const p = new URLSearchParams({
      response_type: "code",
      response_mode: "json",
      client_id: contract.oidc.clientId,
      redirect_uri: contract.oidc.redirectUri,
      scope: contract.oidc.scope,
      state: "a".repeat(32),
      code_challenge: "b".repeat(43),
      code_challenge_method: "S256",
    });
    complete("GET", `${contract.oidc.authorizeUrl}?${p}`);
    complete("POST", contract.oidc.tokenUrl);
    complete("GET", contract.bootstrapReads[0].url);
    supervisor.enterTransition();
    complete("GET", contract.transitionUserInfoUrl);
    supervisor.enterQuiet(1000);
    expect(() =>
      supervisor.assertReadyToClaim(
        1000 + supervisorModule.TASK51_AUTH_QUIET_MS - 1
      )
    ).toThrow();
    supervisor.assertReadyToClaim(1000 + supervisorModule.TASK51_AUTH_QUIET_MS);
    expect(supervisor.snapshot().mode).toBe("strict");
    expect(
      supervisor.beginRequest(
        descriptor("late", "GET", contract.bootstrapReads[0].url)
      ).allowed
    ).toBe(false);
  });
  it("rejects excess bootstrap reads, refresh fallback and failed auth responses", () => {
    for (const fault of ["budget", "refresh", "failed-login"]) {
      const contract = executionSourcesFixture().prewarm;
      const supervisor = supervisorModule.createTask51PreArmSupervisor({
        staticUrls: [...STATIC_URLS],
        prewarmContract: contract,
      });
      expect(
        supervisor.beginRequest(
          descriptor("login", "POST", contract.loginUrl, "xhr")
        ).allowed
      ).toBe(true);
      expect(
        supervisor.finishRequest("login", {
          httpStatus: fault === "failed-login" ? 401 : 200,
        }).allowed
      ).toBe(fault !== "failed-login");
      if (fault === "refresh")
        expect(
          supervisor.beginRequest(
            descriptor(
              "refresh",
              "POST",
              "https://xrugc.com/api-auth/v1/auth/refresh",
              "xhr"
            )
          ).allowed
        ).toBe(false);
      if (fault === "budget")
        for (let i = 0; i < 3; i++) {
          const id = `read-${i}`;
          expect(
            supervisor.beginRequest(
              descriptor(id, "GET", contract.bootstrapReads[0].url)
            ).allowed
          ).toBe(i < 2);
          if (i < 2) supervisor.finishRequest(id, { httpStatus: 200 });
        }
      expect(() => supervisor.enterTransition()).toThrow();
    }
  });
});

function ssoExecutionSourcesFixture() {
  const source = executionSourcesFixture();
  const documents = [
    "https://xrugc.com/?lang=en-US",
    "https://d.xrugc.com/sso",
  ];
  const publicUrl =
    "https://blog.xrugc.com/index.php?per_page=100&hide_empty=false&rest_route=%2Fwp%2Fv2%2Fcategories";
  const prewarm = {
    ...source.prewarm,
    documentUrls: [ROOT_URL, ...documents],
    sso: {
      callbackDocumentUrl: documents[1],
      refreshUrl: "https://d.xrugc.com/api-auth/v1/auth/refresh",
    },
    bootstrapReads: [
      {
        url: publicUrl,
        minimumCount: 1,
        maximumCount: 1,
        phase: "before-login-public",
      },
      {
        url: "https://d.xrugc.com/api/v1/user/info",
        minimumCount: 1,
        maximumCount: 1,
        phase: "after-authentication",
      },
    ],
    transitionUserInfoUrl: "https://d.xrugc.com/api/v1/user/info",
  };
  const p = source.currentWeb.networkProvenance;
  for (const [index, url] of documents.entries()) {
    p.staticUrlManifest.push(url);
    p.staticRequestCounts.push({ url, count: 1 });
    p.staticResponses.push({
      url,
      byteLength: 100,
      contentSha256: "f".repeat(64),
    });
    source.publicSources.push({
      url,
      evidenceRef: `reports/sso-document-${index}.json`,
      evidenceSha256: "c".repeat(64),
    });
  }
  source.publicSources.push({
    url: publicUrl,
    evidenceRef: "reports/public-news.json",
    evidenceSha256: "d".repeat(64),
  });
  p.bootstrapReadAllowlist = prewarm.bootstrapReads.map(({ url }) => url);
  p.staticUrlManifestSha256 = task51StaticUrlManifestSha256(
    p.staticUrlManifest
  );
  p.servedAssetManifestSha256 = task51StaticResponseManifestSha256(
    p.staticResponses
  );
  return { ...source, prewarm };
}

describe("Task 5.1 normal brand SSO prewarm (offline only)", () => {
  const create = () => {
    const source = ssoExecutionSourcesFixture();
    const contract = source.prewarm;
    const supervisor = supervisorModule.createTask51PreArmSupervisor({
      staticUrls: source.currentWeb.networkProvenance.staticUrlManifest,
      prewarmContract: contract,
    });
    let sequence = 0;
    const begin = (method: string, url: string, resource = "xhr") => {
      const request = descriptor(`sso-${++sequence}`, method, url, resource);
      return { request, decision: supervisor.beginRequest(request) };
    };
    const complete = (
      method: string,
      url: string,
      resource = "xhr",
      status = 200
    ) => {
      const { request, decision } = begin(method, url, resource);
      expect(decision.allowed).toBe(true);
      if (decision.category !== "static")
        expect(
          supervisor.finishRequest(request.id, { httpStatus: status }).allowed
        ).toBe(true);
    };
    const publicRead = () => complete("GET", contract.bootstrapReads[0].url);
    const login = () => complete("POST", contract.loginUrl);
    const callback = () =>
      complete("GET", contract.sso.callbackDocumentUrl, "document");
    return {
      source,
      contract,
      supervisor,
      begin,
      complete,
      publicRead,
      login,
      callback,
    };
  };
  it("pins public GETs and performs public reads → brand login → SSO document → one refresh, without OIDC", () => {
    const f = create();
    const parsed = parseTask51StageBExecutionSources(
      `${canonicalTask51Json(f.source)}\n`
    );
    expect(parsed.value.prewarm.oidc).toBe(null);
    f.complete("GET", ROOT_URL, "document");
    f.complete("GET", f.contract.documentUrls[1], "document");
    f.publicRead();
    f.login();
    f.callback();
    f.complete("POST", f.contract.sso.refreshUrl);
    f.complete("GET", f.contract.bootstrapReads[1].url);
    f.supervisor.enterTransition();
    f.complete("GET", f.contract.transitionUserInfoUrl);
    f.supervisor.enterQuiet(1000);
    expect(() =>
      f.supervisor.assertReadyToClaim(
        1000 + supervisorModule.TASK51_AUTH_QUIET_MS - 1
      )
    ).toThrow();
    f.supervisor.assertReadyToClaim(
      1000 + supervisorModule.TASK51_AUTH_QUIET_MS
    );
    expect(f.supervisor.snapshot()).toMatchObject({
      mode: "strict",
      ssoCallbackDocumentCount: 1,
      ssoRefreshPostCount: 1,
    });
  });
  it.each([
    "refresh-before-login",
    "refresh-before-callback",
    "read-before-refresh",
    "read-before-refresh-finished",
    "duplicate-refresh",
    "wrong-refresh",
    "callback-as-fetch",
    "callback-before-login",
    "public-after-login",
    "extra-public-get",
    "login-before-public",
    "failed-refresh",
    "refresh-in-quiet",
  ])("rejects %s at admission/terminal instead of proceeding", (fault) => {
    const f = create();
    if (fault === "refresh-before-login")
      expect(f.begin("POST", f.contract.sso.refreshUrl).decision.allowed).toBe(
        false
      );
    else if (fault === "callback-before-login")
      expect(
        f.begin("GET", f.contract.sso.callbackDocumentUrl, "document").decision
          .allowed
      ).toBe(false);
    else if (fault === "extra-public-get")
      expect(
        f.begin("GET", f.contract.bootstrapReads[0].url + "&page=2").decision
          .allowed
      ).toBe(false);
    else if (fault === "login-before-public")
      expect(f.begin("POST", f.contract.loginUrl).decision.allowed).toBe(false);
    else {
      f.publicRead();
      f.login();
      if (fault === "public-after-login")
        expect(
          f.begin("GET", f.contract.bootstrapReads[0].url).decision.allowed
        ).toBe(false);
      else if (fault === "refresh-before-callback")
        expect(
          f.begin("POST", f.contract.sso.refreshUrl).decision.allowed
        ).toBe(false);
      else if (fault === "callback-as-fetch")
        expect(
          f.begin("GET", f.contract.sso.callbackDocumentUrl).decision.allowed
        ).toBe(false);
      else {
        f.callback();
        if (fault === "read-before-refresh")
          expect(
            f.begin("GET", f.contract.bootstrapReads[1].url).decision.allowed
          ).toBe(false);
        else if (fault === "wrong-refresh")
          expect(
            f.begin("POST", "https://other.example/api-auth/v1/auth/refresh")
              .decision.allowed
          ).toBe(false);
        else if (
          fault === "read-before-refresh-finished" ||
          fault === "failed-refresh"
        ) {
          const { request, decision } = f.begin(
            "POST",
            f.contract.sso.refreshUrl
          );
          expect(decision.allowed).toBe(true);
          if (fault === "read-before-refresh-finished")
            expect(
              f.begin("GET", f.contract.bootstrapReads[1].url).decision.allowed
            ).toBe(false);
          else
            expect(
              f.supervisor.finishRequest(request.id, { httpStatus: 401 })
                .allowed
            ).toBe(false);
        } else {
          f.complete("POST", f.contract.sso.refreshUrl);
          if (fault === "refresh-in-quiet") {
            f.complete("GET", f.contract.bootstrapReads[1].url);
            f.supervisor.enterTransition();
            f.complete("GET", f.contract.transitionUserInfoUrl);
            f.supervisor.enterQuiet(1000);
          }
          expect(
            f.begin("POST", f.contract.sso.refreshUrl).decision.allowed
          ).toBe(false);
        }
      }
    }
    expect(() => f.supervisor.enterTransition()).toThrow();
  });
  it.each([
    "missing-public-grant",
    "missing-public-source",
    "wrong-info-origin",
    "fragment-callback",
    "oidc-and-sso",
    "public-range",
    "wrong-phase",
  ])("fails closed for %s in the owner-bound contract", (fault) => {
    const value = ssoExecutionSourcesFixture();
    if (fault === "missing-public-grant") {
      value.prewarm.bootstrapReads.shift();
      value.currentWeb.networkProvenance.bootstrapReadAllowlist.shift();
      const supervisor = supervisorModule.createTask51PreArmSupervisor({
        staticUrls: value.currentWeb.networkProvenance.staticUrlManifest,
        prewarmContract: value.prewarm,
      });
      expect(
        supervisor.beginRequest(
          descriptor(
            "ungranted",
            "GET",
            ssoExecutionSourcesFixture().prewarm.bootstrapReads[0].url
          )
        ).allowed
      ).toBe(false);
      return;
    }
    if (fault === "missing-public-source")
      value.publicSources = value.publicSources.filter(
        ({ url }) => url !== value.prewarm.bootstrapReads[0].url
      );
    if (fault === "wrong-info-origin")
      value.prewarm.transitionUserInfoUrl =
        "https://other.example/api/v1/user/info";
    if (fault === "fragment-callback")
      value.prewarm.sso.callbackDocumentUrl += "#unread-fragment";
    if (fault === "oidc-and-sso")
      value.prewarm.oidc = {
        authorizeUrl: "https://xrugc.com/api-auth/authorize",
        tokenUrl: "https://xrugc.com/api-auth/token",
        clientId: "test",
        redirectUri: "https://d.xrugc.com/auth/callback",
        scope: "openid",
      };
    if (fault === "public-range")
      value.prewarm.bootstrapReads[0].maximumCount = 2;
    if (fault === "wrong-phase")
      value.prewarm.bootstrapReads[0].phase = "any-time";
    expect(() =>
      parseTask51StageBExecutionSources(`${canonicalTask51Json(value)}\n`)
    ).toThrow();
  });
  it("obtains refresh metadata without reading auth material", async () => {
    const forbidden = vi.fn(() => {
      throw new Error("auth material must not be read");
    });
    const request = {
      method: () => "POST",
      url: () => "https://d.xrugc.com/api-auth/v1/auth/refresh",
      resourceType: () => "xhr",
      redirectedFrom: () => null,
      headerValue: forbidden,
      allHeaders: forbidden,
      headers: forbidden,
      postData: forbidden,
      postDataJSON: forbidden,
    };
    expect(
      await createTask51SafeRequestDescriptor(request, "refresh-metadata")
    ).toMatchObject({
      method: "POST",
      corsRequestHeaderNames: null,
      corsRequestMethod: null,
    });
    expect(forbidden).not.toHaveBeenCalled();
  });
  it("admits only the exact public/refresh OPTIONS metadata and never an authorization-bearing public preflight", () => {
    const f = create();
    const preflight = (
      id: string,
      url: string,
      method: string,
      names: string
    ) => descriptor(id, "OPTIONS", url, "other", false, method, names);
    expect(
      f.supervisor.beginRequest(
        preflight(
          "public-options",
          f.contract.bootstrapReads[0].url,
          "GET",
          "content-type"
        )
      ).allowed
    ).toBe(true);
    expect(
      f.supervisor.finishRequest("public-options", { httpStatus: 204 }).allowed
    ).toBe(true);
    f.publicRead();
    f.login();
    f.callback();
    expect(
      f.supervisor.beginRequest(
        preflight(
          "refresh-options",
          f.contract.sso.refreshUrl,
          "POST",
          "content-type"
        )
      ).allowed
    ).toBe(true);
    expect(
      f.supervisor.finishRequest("refresh-options", { httpStatus: 204 }).allowed
    ).toBe(true);
    f.complete("POST", f.contract.sso.refreshUrl);
    const denied = create();
    expect(
      denied.supervisor.beginRequest(
        preflight(
          "public-auth-option",
          denied.contract.bootstrapReads[0].url,
          "GET",
          "authorization,content-type"
        )
      ).allowed
    ).toBe(false);
  });
});

describe("Task 5.1 mandatory execution preflight", () => {
  it("passes both matrix bindings through the same assembler used by the real F read", () => {
    const prepared = {
      approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-20260911",
      executionId: "task51-stage-b-offline-test-20260911",
      stageB: { expiresAt: "2026-09-11T03:00:00.000Z" },
      productionDirectMatrixEvidenceRef: "reports/offline-matrix.json",
      productionDirectMatrixSubjectDigest: "a".repeat(64),
      stageBExecutionEvidenceSha256: "b".repeat(64),
    };
    const claim = {
      claimedAt: "2026-09-11T02:00:00.000Z",
      receiptSha256: "c".repeat(64),
    };
    expect(task51RunnerFragmentBindings(prepared, claim)).toMatchObject({
      productionDirectMatrixEvidenceRef:
        prepared.productionDirectMatrixEvidenceRef,
      productionDirectMatrixSubjectDigest:
        prepared.productionDirectMatrixSubjectDigest,
    });
    for (const key of [
      "productionDirectMatrixEvidenceRef",
      "productionDirectMatrixSubjectDigest",
    ]) {
      const incomplete = { ...prepared };
      delete incomplete[key];
      expect(() => task51RunnerFragmentBindings(incomplete, claim)).toThrow(
        "TASK51_RUNNER_FRAGMENT_BINDINGS_REJECTED"
      );
    }
  });
  it("rejects missing sources before prepare, launch or claim", async () => {
    const launch = vi.fn();
    const prepare = vi.spyOn(supervisorModule, "prepareTask51StageB");
    const claim = vi.spyOn(supervisorModule, "claimPreparedTask51StageB");
    try {
      await expect(
        runTask51HeadedNetworkAttestor({}, { chromium: { launch } })
      ).rejects.toThrow("TASK51_EXECUTION_PREFLIGHT_INPUTS_REJECTED");
      expect(prepare).not.toHaveBeenCalled();
      expect(launch).not.toHaveBeenCalled();
      expect(claim).not.toHaveBeenCalled();
    } finally {
      prepare.mockRestore();
      claim.mockRestore();
    }
  });
});

describe("Task 5.1 browser network fixed ledger", () => {
  it("uses the exact same runner route in the supervisor and network policy", () => {
    expect(TASK51_RUNNER_URL).toBe(
      `${TASK51_NETWORK_CONSTANTS.productionOrigin}${TASK51_NETWORK_CONSTANTS.runnerPath}`
    );
  });
  it("fixes 4 login + 4 logout + 56 exact GET requests in runner order", () => {
    expect(TASK51_BUSINESS_LEDGER).toHaveLength(
      TASK51_EXPECTED_BUSINESS_REQUEST_COUNT
    );
    expect(
      TASK51_BUSINESS_LEDGER.filter(({ kind }) => kind === "login-post")
    ).toHaveLength(4);
    expect(
      TASK51_BUSINESS_LEDGER.filter(({ kind }) => kind === "logout-post")
    ).toHaveLength(4);
    expect(
      TASK51_BUSINESS_LEDGER.filter(({ kind }) => kind === "evidence-get")
    ).toHaveLength(56);
    expect(TASK51_BUSINESS_LEDGER.slice(0, 8).map(({ kind }) => kind)).toEqual([
      "login-post",
      "logout-post",
      "login-post",
      "logout-post",
      "login-post",
      "logout-post",
      "login-post",
      "logout-post",
    ]);
  });

  it("allows only exact d.xrugc.com static GET and excludes same-origin APIs", () => {
    expect(() =>
      createTask51NetworkLedger({ runnerUrl: RUNNER_URL, staticUrls: [] })
    ).toThrow("TASK51_NETWORK_STATIC_URL_REJECTED");
    expect(() =>
      createTask51NetworkLedger({
        runnerUrl: RUNNER_URL,
        staticUrls: [STATIC_URL, STATIC_URL],
      })
    ).toThrow("TASK51_NETWORK_STATIC_URL_REJECTED");
    expect(() =>
      createTask51NetworkLedger({
        runnerUrl: RUNNER_URL,
        staticUrls: ["https://d.xrugc.com/api/user/info"],
      })
    ).toThrow("TASK51_NETWORK_STATIC_URL_REJECTED");
    expect(() =>
      createTask51NetworkLedger({
        runnerUrl: RUNNER_URL,
        staticUrls: ["https://d.xrugc.com/api-auth/session"],
      })
    ).toThrow("TASK51_NETWORK_STATIC_URL_REJECTED");
    expect(() =>
      createTask51NetworkLedger({
        runnerUrl: RUNNER_URL,
        staticUrls: ["https://d.xrugc.com/assets/task51.js?token=forbidden"],
      })
    ).toThrow("TASK51_NETWORK_STATIC_URL_REJECTED");

    const { ledger } = createLedger();
    expect(
      ledger.beginRequest(descriptor("static", "HEAD", STATIC_URL, "script"))
    ).toMatchObject({ allowed: false });
    expect(
      ledger.beginRequest(
        descriptor(
          "unknown-static",
          "GET",
          "https://d.xrugc.com/assets/not-fixed.js",
          "script"
        )
      ).allowed
    ).toBe(false);
  });

  it("arms only on the exact runner URL with no business request underway", () => {
    const { ledger } = createLedger();
    expect(() => ledger.arm("https://d.xrugc.com/home")).toThrow(
      "TASK51_NETWORK_ARM_URL_MISMATCH"
    );
    expect(
      ledger.beginRequest(
        descriptor("pre-arm-business", "POST", TASK51_BUSINESS_LEDGER[0].url)
      ).allowed
    ).toBe(false);
    expect(ledger.snapshot().activeBusinessRequestCount).toBe(0);
    ledger.arm(RUNNER_URL);
    expect(ledger.snapshot().armed).toBe(true);
    expect(() => ledger.arm(RUNNER_URL)).toThrow(
      "TASK51_NETWORK_DUPLICATE_ARM"
    );
  });

  it("refuses to arm while any browser request is still in flight", () => {
    const { ledger } = createLedger();
    expect(
      ledger.beginRequest(descriptor("static", "GET", STATIC_URL, "script"))
        .allowed
    ).toBe(true);
    expect(ledger.snapshot().activeRequestCount).toBe(1);
    expect(() => ledger.arm(RUNNER_URL)).toThrow(
      "TASK51_NETWORK_ARM_BUSINESS_NOT_QUIET"
    );
    ledger.finishRequest("static", staticMetadata(STATIC_URL));
    expect(ledger.snapshot().activeRequestCount).toBe(0);
    ledger.arm(RUNNER_URL);
  });

  it("counts only fixed endpoint OPTIONS and requires their lifecycle terminal", () => {
    const { ledger } = createLedger();
    ledger.arm(RUNNER_URL);
    const allowed = optionsDescriptor("options", TASK51_BUSINESS_LEDGER[0]);
    expect(ledger.beginRequest(allowed)).toMatchObject({
      allowed: true,
      category: "options",
    });
    expect(ledger.snapshot().optionsCount).toBe(1);
    expect(
      ledger.beginRequest(
        optionsDescriptor("unknown-options", TASK51_BUSINESS_LEDGER[0], {
          url: "https://api.xrteeth.com/v1/unknown",
        })
      ).allowed
    ).toBe(false);
    expect(ledger.finishRequest(allowed.id, OPTIONS_METADATA).allowed).toBe(
      true
    );
  });

  it("allows at most one OPTIONS for the exact next business request", () => {
    const { ledger } = createLedger();
    ledger.arm(RUNNER_URL);
    const first = TASK51_BUSINESS_LEDGER[0];
    const second = TASK51_BUSINESS_LEDGER[1];
    expect(
      ledger.beginRequest(
        optionsDescriptor("wrong-order", first, { url: second.url })
      ).allowed
    ).toBe(false);
    expect(
      ledger.beginRequest(
        optionsDescriptor("wrong-method", first, {
          corsRequestMethod: "GET",
        })
      ).allowed
    ).toBe(false);
    expect(
      ledger.beginRequest(
        optionsDescriptor("wrong-headers", first, {
          corsRequestHeaderNames: "authorization,content-type",
        })
      ).allowed
    ).toBe(false);
    const firstOptions = optionsDescriptor("first-options", first);
    expect(ledger.beginRequest(firstOptions).allowed).toBe(true);
    expect(
      ledger.finishRequest(firstOptions.id, OPTIONS_METADATA).allowed
    ).toBe(true);
    expect(
      ledger.beginRequest(optionsDescriptor("duplicate-options", first)).allowed
    ).toBe(false);
    expect(ledger.snapshot()).toMatchObject({
      optionsCount: 1,
      unexpectedRequestCount: 4,
    });
  });

  it("requires every exact static URL once and rejects duplicate static loads", () => {
    const duplicate = createLedger().ledger;
    const firstStatic = descriptor("static-1", "GET", STATIC_URL, "script");
    expect(duplicate.beginRequest(firstStatic).allowed).toBe(true);
    duplicate.finishRequest(firstStatic.id, staticMetadata(STATIC_URL));
    expect(
      duplicate.beginRequest(
        descriptor("static-2", "GET", STATIC_URL, "script")
      ).allowed
    ).toBe(false);
    expect(duplicate.snapshot()).toMatchObject({
      retryCount: 1,
      unexpectedRequestCount: 1,
    });

    const missing = createLedger().ledger;
    missing.arm(RUNNER_URL);
    completeBusinessLedger(missing);
    expect(() => missing.finalize()).toThrow(
      "TASK51_NETWORK_FINALIZE_REJECTED"
    );
  });

  it("rejects every static request after the first business dispatch", () => {
    const { ledger } = createLedger();
    ledger.arm(RUNNER_URL);
    const first = TASK51_BUSINESS_LEDGER[0];
    expect(
      ledger.beginRequest(descriptor("business", first.method, first.url))
        .allowed
    ).toBe(true);
    ledger.finishRequest("business", businessMetadata(first));
    expect(
      ledger.beginRequest(
        descriptor("late-static", "GET", STATIC_URL, "script")
      ).allowed
    ).toBe(false);
    expect(ledger.snapshot().unexpectedRequestCount).toBe(1);
  });

  it("rejects a saved-fetch-style extra request after all 64 terminals", () => {
    const { ledger } = createLedger();
    ledger.arm(RUNNER_URL);
    completeBusinessLedger(ledger);
    const last = TASK51_BUSINESS_LEDGER.at(-1)!;
    expect(
      ledger.beginRequest(
        descriptor("saved-fetch-extra", last.method, last.url)
      ).allowed
    ).toBe(false);
    expect(ledger.snapshot()).toMatchObject({
      retryCount: 1,
      unexpectedRequestCount: 1,
    });
    expect(() => ledger.finalize()).toThrow("TASK51_NETWORK_FINALIZE_REJECTED");
  });

  it.each([
    ["beacon", "ping"],
    ["image", "image"],
    ["iframe", "document"],
    ["xhr", "xhr"],
    ["websocket", "websocket"],
  ])("rejects %s transport/resource traffic", (_label, resourceType) => {
    const { ledger } = createLedger();
    ledger.arm(RUNNER_URL);
    expect(
      ledger.beginRequest(
        descriptor(
          `forbidden-${resourceType}`,
          TASK51_BUSINESS_LEDGER[0].method,
          TASK51_BUSINESS_LEDGER[0].url,
          resourceType
        )
      ).allowed
    ).toBe(false);
  });

  it.each([
    "popup",
    "download",
    "navigation",
    "service-worker",
    "websocket",
  ] as const)(
    "records %s as an unconditional strict-window violation",
    (channel) => {
      const { ledger, onViolation } = createLedger();
      ledger.arm(RUNNER_URL);
      expect(ledger.recordForbiddenChannel(channel).allowed).toBe(false);
      expect(onViolation).toHaveBeenCalledOnce();
      expect(ledger.snapshot().unexpectedRequestCount).toBe(1);
    }
  );

  it("rejects duplicate, unknown and unfinished request lifecycle states", () => {
    const first = TASK51_BUSINESS_LEDGER[0];

    const duplicate = createLedger().ledger;
    duplicate.arm(RUNNER_URL);
    expect(
      duplicate.beginRequest(descriptor("same", first.method, first.url))
        .allowed
    ).toBe(true);
    expect(
      duplicate.beginRequest(descriptor("same", first.method, first.url))
        .allowed
    ).toBe(false);
    expect(duplicate.snapshot()).toMatchObject({
      retryCount: 1,
      unexpectedRequestCount: 1,
    });

    const unknown = createLedger().ledger;
    unknown.arm(RUNNER_URL);
    expect(unknown.finishRequest("never-started").allowed).toBe(false);
    expect(unknown.snapshot().unexpectedRequestCount).toBe(1);

    const unfinished = createLedger().ledger;
    unfinished.arm(RUNNER_URL);
    TASK51_BUSINESS_LEDGER.forEach((expected, index) => {
      const id = `unfinished-${index}`;
      expect(
        unfinished.beginRequest(descriptor(id, expected.method, expected.url))
          .allowed
      ).toBe(true);
      if (index < TASK51_BUSINESS_LEDGER.length - 1) {
        unfinished.finishRequest(id, businessMetadata(expected));
      }
    });
    expect(unfinished.snapshot()).toMatchObject({
      activeBusinessRequestCount: 1,
      terminalBusinessRequestCount: 63,
    });
    expect(() => unfinished.finalize()).toThrow(
      "TASK51_NETWORK_FINALIZE_REJECTED"
    );
  });

  it("rejects redirects and request failures without retrying", () => {
    const redirected = createLedger().ledger;
    redirected.arm(RUNNER_URL);
    const first = TASK51_BUSINESS_LEDGER[0];
    expect(
      redirected.beginRequest(
        descriptor("redirect", first.method, first.url, "fetch", true)
      ).allowed
    ).toBe(false);
    expect(redirected.snapshot()).toMatchObject({
      redirectCount: 1,
      unexpectedRequestCount: 1,
    });

    const failed = createLedger().ledger;
    failed.arm(RUNNER_URL);
    expect(
      failed.beginRequest(descriptor("failed", first.method, first.url)).allowed
    ).toBe(true);
    expect(failed.failRequest("failed").allowed).toBe(true);
    expect(failed.snapshot()).toMatchObject({
      activeBusinessRequestCount: 0,
      failureCount: 1,
      terminalBusinessRequestCount: 1,
    });
  });

  it("rejects requests after finalize and duplicate finalize", () => {
    const network = completedNetwork();
    expect(network.armed).toBe(true);
    const { ledger } = createLedger();
    for (const url of STATIC_URLS) {
      const id = `static-${url}`;
      ledger.beginRequest(descriptor(id, "GET", url, "script"));
      ledger.finishRequest(id, staticMetadata(url));
    }
    ledger.arm(RUNNER_URL);
    completeBusinessLedger(ledger);
    ledger.finalize();
    expect(
      ledger.beginRequest(descriptor("late", "GET", STATIC_URL, "script"))
        .allowed
    ).toBe(false);
    expect(() => ledger.finalize()).toThrow(
      "TASK51_NETWORK_DUPLICATE_FINALIZE"
    );
  });

  it("never accepts request descriptors containing headers, bodies or tokens", () => {
    const { ledger } = createLedger();
    ledger.arm(RUNNER_URL);
    const unsafe = {
      ...descriptor(
        "unsafe",
        TASK51_BUSINESS_LEDGER[0].method,
        TASK51_BUSINESS_LEDGER[0].url
      ),
      headers: { Authorization: "Bearer never-store-this" },
    };
    expect(() => ledger.beginRequest(unsafe)).toThrow(
      "TASK51_NETWORK_UNSAFE_REQUEST_DESCRIPTOR"
    );
    expect(JSON.stringify(ledger.snapshot())).not.toContain("never-store-this");
  });
});

describe("Task 5.1 canonical safe network receipt", () => {
  it("binds each candidate to its own branch tree without rewriting historical trees", () => {
    const artifact = JSON.parse(stageAAttestorArtifact());
    const release = artifact.networkAttestorRelease;
    // These are the distinct develop and main/publish trees in frozen A.
    release.developTreeSha = "91156708b83917d60649dbb32d05d76429373bf2";
    release.mainTreeSha = "1a97799debc710fda38a72f193921afaf2432512";
    release.publishTreeSha = release.mainTreeSha;
    release.ciTreeSha = release.publishTreeSha;
    for (const branch of ["develop", "main", "publish"]) {
      release[`${branch}CandidateTreeSha`] = release[`${branch}TreeSha`];
    }
    const raw = `${canonicalTask51Json(artifact)}\n`;
    expect(parseTask51NetworkAttestorReleaseEvidence(raw).raw).toBe(raw);
    for (const branch of ["develop", "main", "publish"]) {
      const invalid = structuredClone(artifact);
      invalid.networkAttestorRelease[`${branch}CandidateTreeSha`] =
        branch === "develop" ? release.mainTreeSha : release.developTreeSha;
      expect(() =>
        parseTask51NetworkAttestorReleaseEvidence(
          `${canonicalTask51Json(invalid)}\n`
        )
      ).toThrow("TASK51_STAGE_A_ATTESTOR_RELEASE_REJECTED");
    }
    const invalidContent = structuredClone(artifact);
    invalidContent.networkAttestorRelease.mainCandidateContentSha256 =
      "8".repeat(64);
    expect(() =>
      parseTask51NetworkAttestorReleaseEvidence(
        `${canonicalTask51Json(invalidContent)}\n`
      )
    ).toThrow("TASK51_STAGE_A_ATTESTOR_RELEASE_REJECTED");
  });

  it("parses canonical Stage A attestor bytes and rejects provenance forgery", () => {
    const raw = stageAAttestorArtifact();
    const parsed = parseTask51NetworkAttestorReleaseEvidence(raw);
    expect(parsed.sha256).toBe(task51Sha256(raw));
    expect(parsed.value.networkAttestorRelease.browser.binarySha256).toBe(
      "3".repeat(64)
    );

    const forged = JSON.parse(raw);
    forged.networkAttestorRelease.networkProvenance.staticResponses[0].byteLength += 1;
    expect(() =>
      parseTask51NetworkAttestorReleaseEvidence(
        `${canonicalTask51Json(forged)}\n`
      )
    ).toThrow("TASK51_STAGE_A_ATTESTOR_PROVENANCE_REJECTED");
    expect(() => parseTask51NetworkAttestorReleaseEvidence(raw.trim())).toThrow(
      "TASK51_STAGE_A_ATTESTOR_CANONICAL_REJECTED"
    );

    const traversalRef = JSON.parse(raw);
    traversalRef.networkAttestorRelease.evidenceRef = "reports/../x.json";
    expect(() =>
      parseTask51NetworkAttestorReleaseEvidence(
        `${canonicalTask51Json(traversalRef)}\n`
      )
    ).toThrow("TASK51_STAGE_A_ATTESTOR_RELEASE_REJECTED");
    const emptySegmentRef = JSON.parse(raw);
    emptySegmentRef.networkAttestorRelease.browser.evidenceRef =
      "reports/browser//evidence.json";
    expect(() =>
      parseTask51NetworkAttestorReleaseEvidence(
        `${canonicalTask51Json(emptySegmentRef)}\n`
      )
    ).toThrow("TASK51_STAGE_A_ATTESTOR_BROWSER_REJECTED");

    for (const invalidAllowlist of [
      [TASK51_BOOTSTRAP_READ_ALLOWLIST[0]],
      [...TASK51_BOOTSTRAP_READ_ALLOWLIST].reverse(),
      [TASK51_BOOTSTRAP_READ_ALLOWLIST[0], TASK51_BOOTSTRAP_READ_ALLOWLIST[0]],
    ]) {
      const invalidBootstrap = JSON.parse(raw);
      invalidBootstrap.networkAttestorRelease.networkProvenance.bootstrapReadAllowlist =
        invalidAllowlist;
      expect(() =>
        parseTask51NetworkAttestorReleaseEvidence(
          `${canonicalTask51Json(invalidBootstrap)}\n`
        )
      ).toThrow("TASK51_STAGE_A_ATTESTOR_PROVENANCE_REJECTED");
    }

    for (const [field, timestamp] of [
      ["completedAt", "2026-08-28T24:00:00+08:00"],
      ["ciCompletedAt", "2026-08-28T00:30:00+14:01"],
      ["cleanCheckoutImportSmokeAt", "2026-02-30T00:40:00Z"],
    ] as const) {
      const invalidTimestamp = JSON.parse(raw);
      if (field === "completedAt") {
        invalidTimestamp.completedAt = timestamp;
      } else {
        invalidTimestamp.networkAttestorRelease[field] = timestamp;
      }
      expect(() =>
        parseTask51NetworkAttestorReleaseEvidence(
          `${canonicalTask51Json(invalidTimestamp)}\n`
        )
      ).toThrow("TASK51_STAGE_A_ATTESTOR_RELEASE_REJECTED");
    }
  });

  it("binds approval, execution, Stage B, web release and runner fragment", () => {
    const network = completedNetwork();
    const bindings = bindingsFor(network);
    const receipt = buildTask51NetworkReceipt(bindings, network, FLAGS);
    const {
      staticUrls: _staticUrls,
      staticUrlManifestSha256: _staticUrlManifestSha256,
      ...receiptBindings
    } = bindings;
    expect(receipt).toMatchObject({
      ...receiptBindings,
      flags: FLAGS,
      network: {
        expectedBusinessRequestCount: 64,
        terminalBusinessRequestCount: 64,
        activeBusinessRequestCount: 0,
        unexpectedRequestCount: 0,
        redirectCount: 0,
        retryCount: 0,
        failureCount: 0,
      },
    });
    const serialized = serializeTask51NetworkReceipt(receipt);
    expect(parseTask51NetworkReceipt(serialized)).toEqual(receipt);
    expect(serialized).toBe(canonicalTask51Json(JSON.parse(serialized)));
    expect(serialized).not.toMatch(/bearer|postData|"body"|"cookie"/i);
  });

  it("canonicalizes static responses independently of browser request order", () => {
    const network = completedNetwork([...STATIC_URLS].reverse());
    const receipt = buildTask51NetworkReceipt(
      bindingsFor(network),
      network,
      FLAGS
    );
    expect(receipt.staticUrlManifest.responses.map(({ url }) => url)).toEqual(
      STATIC_URLS
    );
    expect(
      receipt.staticUrlManifest.responses.map(({ sequence }) => sequence)
    ).toEqual([2, 1]);
    expect(
      parseTask51NetworkReceipt(serializeTask51NetworkReceipt(receipt))
    ).toEqual(receipt);

    for (const mutate of [
      (value: typeof receipt) => value.staticUrlManifest.responses.reverse(),
      (value: typeof receipt) => {
        value.staticUrlManifest.responses[0].sequence = 99;
      },
    ]) {
      const forged = structuredClone(receipt);
      mutate(forged);
      expect(() =>
        parseTask51NetworkReceipt(
          canonicalTask51Json({
            receipt: forged,
            receiptSha256: task51Sha256(forged),
          })
        )
      ).toThrow("TASK51_NETWORK_RECEIPT_STATIC_RESPONSE_REJECTED");
    }
  });

  it("rejects a forged receipt that hides active or missing static requests", () => {
    const completed = completedNetwork();
    const bindings = bindingsFor(completed);
    expect(() =>
      buildTask51NetworkReceipt(
        bindings,
        {
          ...completed,
          activeRequestCount: 7,
        },
        FLAGS
      )
    ).toThrow("TASK51_NETWORK_RECEIPT_TERMINAL_GATE_REJECTED");
    expect(() =>
      buildTask51NetworkReceipt(
        bindings,
        {
          ...completed,
          optionsCount: 65,
        },
        FLAGS
      )
    ).toThrow("TASK51_NETWORK_RECEIPT_TERMINAL_GATE_REJECTED");
    expect(() =>
      buildTask51NetworkReceipt(
        bindings,
        {
          ...completed,
          staticRequestCount: completed.expectedStaticRequestCount - 1,
        },
        FLAGS
      )
    ).toThrow("TASK51_NETWORK_RECEIPT_TERMINAL_GATE_REJECTED");
    expect(() =>
      buildTask51NetworkReceipt(
        bindings,
        {
          ...completed,
          expectedStaticRequestCount: 0,
          staticRequestCount: 0,
        },
        FLAGS
      )
    ).toThrow("TASK51_NETWORK_RECEIPT_TERMINAL_GATE_REJECTED");
  });

  it("rejects missing or rewritten transcript evidence with recomputed hashes", () => {
    const receipt = buildCompletedReceipt();
    const missing = JSON.parse(JSON.stringify(receipt));
    delete missing.network.transcript;
    expect(() =>
      parseTask51NetworkReceipt(
        canonicalTask51Json({
          receipt: missing,
          receiptSha256: task51Sha256(missing),
        })
      )
    ).toThrow("TASK51_NETWORK_RECEIPT_NETWORK_REJECTED");

    const rewritten = JSON.parse(JSON.stringify(receipt));
    const business = rewritten.network.transcript.find(
      (entry: { category: string }) => entry.category === "business"
    );
    business.httpStatus = 201;
    rewritten.network.transcriptSha256 = task51Sha256(
      canonicalTask51Json(rewritten.network.transcript)
    );
    expect(() =>
      parseTask51NetworkReceipt(
        canonicalTask51Json({
          receipt: rewritten,
          receiptSha256: task51Sha256(rewritten),
        })
      )
    ).toThrow("TASK51_NETWORK_RECEIPT_BUSINESS_TRANSCRIPT_REJECTED");
  });

  it("rejects transcript reordering even when every hash is recomputed", () => {
    const parseRehashed = (receipt: ReturnType<typeof JSON.parse>) => {
      receipt.network.transcript.forEach(
        (entry: { sequence: number }, index: number) => {
          entry.sequence = index + 1;
        }
      );
      receipt.network.transcriptSha256 = task51Sha256(
        canonicalTask51Json(receipt.network.transcript)
      );
      return () =>
        parseTask51NetworkReceipt(
          canonicalTask51Json({
            receipt,
            receiptSha256: task51Sha256(receipt),
          })
        );
    };

    const lateStatic = JSON.parse(JSON.stringify(buildCompletedReceipt()));
    const movedStatic = lateStatic.network.transcript.shift();
    const firstBusinessIndex = lateStatic.network.transcript.findIndex(
      (entry: { category: string }) => entry.category === "business"
    );
    lateStatic.network.transcript.splice(
      firstBusinessIndex + 1,
      0,
      movedStatic
    );
    expect(parseRehashed(lateStatic)).toThrow(
      "TASK51_NETWORK_RECEIPT_STATIC_TRANSCRIPT_REJECTED"
    );

    const lateOptions = JSON.parse(JSON.stringify(buildCompletedReceipt()));
    const optionsIndex = lateOptions.network.transcript.findIndex(
      (entry: { category: string }) => entry.category === "options"
    );
    const [movedOptions] = lateOptions.network.transcript.splice(
      optionsIndex,
      1
    );
    const businessZeroIndex = lateOptions.network.transcript.findIndex(
      (entry: { category: string; businessIndex: number }) =>
        entry.category === "business" && entry.businessIndex === 0
    );
    lateOptions.network.transcript.splice(
      businessZeroIndex + 1,
      0,
      movedOptions
    );
    expect(parseRehashed(lateOptions)).toThrow(
      "TASK51_NETWORK_RECEIPT_OPTIONS_TRANSCRIPT_REJECTED"
    );

    const futureOptions = JSON.parse(JSON.stringify(buildCompletedReceipt()));
    const future = futureOptions.network.transcript.find(
      (entry: { category: string }) => entry.category === "options"
    );
    future.businessIndex = 1;
    future.url = TASK51_BUSINESS_LEDGER[1].url;
    future.corsMethod = TASK51_BUSINESS_LEDGER[1].method;
    future.corsNames = "authorization,content-type";
    expect(parseRehashed(futureOptions)).toThrow(
      "TASK51_NETWORK_RECEIPT_OPTIONS_TRANSCRIPT_REJECTED"
    );
  });

  it("rejects forged observed lifecycle flags", () => {
    const network = completedNetwork();
    expect(() =>
      buildTask51NetworkReceipt(bindingsFor(network), network, {
        ...FLAGS,
        noWebSockets: false,
      })
    ).toThrow("TASK51_NETWORK_RECEIPT_FLAG_FALSE");
  });

  it("rejects invalid UTF-8 receipt bytes", () => {
    expect(() => parseTask51NetworkReceipt(new Uint8Array([0xff]))).toThrow(
      "TASK51_NETWORK_RECEIPT_BYTES_REJECTED"
    );
  });

  it.each(["headers", "postData", "body", "cookie", "token"])(
    "rejects forbidden receipt field %s even with a matching recomputed hash",
    (field) => {
      const receipt = buildCompletedReceipt();
      const poisoned = { ...receipt, [field]: "must-not-survive" };
      const envelope = {
        receipt: poisoned,
        receiptSha256: task51Sha256(poisoned),
      };
      expect(() =>
        parseTask51NetworkReceipt(canonicalTask51Json(envelope))
      ).toThrow("TASK51_NETWORK_RECEIPT_FORBIDDEN_FIELD");
    }
  );

  it("rejects a canonical receipt hash mismatch", () => {
    const receipt = buildCompletedReceipt();
    const envelope = JSON.parse(serializeTask51NetworkReceipt(receipt));
    envelope.receiptSha256 = "d".repeat(64);
    expect(() =>
      parseTask51NetworkReceipt(canonicalTask51Json(envelope))
    ).toThrow("TASK51_NETWORK_RECEIPT_HASH_MISMATCH");
  });

  it("rejects non-canonical whitespace even when the content hash is valid", () => {
    const receipt = buildCompletedReceipt();
    const envelope = JSON.parse(serializeTask51NetworkReceipt(receipt));
    expect(() =>
      parseTask51NetworkReceipt(JSON.stringify(envelope, null, 2))
    ).toThrow("TASK51_NETWORK_RECEIPT_NON_CANONICAL");
  });
});
