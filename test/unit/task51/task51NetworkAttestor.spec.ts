import { mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  TASK51_BOOTSTRAP_READ_ALLOWLIST,
  TASK51_BUSINESS_LEDGER,
  TASK51_EXPECTED_BUSINESS_REQUEST_COUNT,
  TASK51_NETWORK_CONSTANTS,
  TASK51_NAVIGATION_PUBLIC_ASSETS,
  TASK51_OPTIONAL_PUBLIC_READ_URLS,
  TASK51_PUBLIC_STARTUP_READ_IDENTITIES,
  TASK51_PUBLIC_STARTUP_REQUEST_SHA256,
  assertTask51CurrentStableEntry,
  TASK51_CURRENT_STABLE_ENTRY_REQUEST_SHA256,
  TASK51_CURRENT_STABLE_ENTRY_URL,
  TASK51_CURRENT_STABLE_ENTRY_RESPONSE,
  TASK51_STABLE_ENTRY_COLD_PUBLIC_READ_URLS,
  assertTask51PublicStartupLifecyclePlan,
  assertTask51PublicStartupLifecycleReceipt,
  createTask51NetworkLedger,
  isTask51RunnerPageUrl,
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
  pushTask51RunnerThroughVueRouter,
  task51RunnerFragmentBindings,
  installTask51PublicStartupLifecycleNative,
  isTask51PolicyBlockedNativeFailure,
  drainTask51PublicStartupNavigation,
  assertTask51HeadedWarmEntry,
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

function completedNetwork(
  staticRequestUrls: readonly string[] = STATIC_URLS,
  actualRunnerUrl = RUNNER_URL
) {
  const { ledger } = createLedger();
  staticRequestUrls.forEach((url, index) => {
    const staticAsset = descriptor(`static-${index}`, "GET", url, "script");
    expect(ledger.beginRequest(staticAsset).allowed).toBe(true);
    expect(
      ledger.finishRequest(staticAsset.id, staticMetadata(url)).allowed
    ).toBe(true);
  });
  ledger.arm(actualRunnerUrl);
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

const STARTUP_TARGET = "https://xrugc.com/?lang=zh-CN";
const STARTUP_ENTRY_SCRIPT = "https://d.xrugc.com/js/index.DmVWUsa-.js";
function startupPlan() {
  const urls = [
    ROOT_URL,
    STARTUP_TARGET,
    STARTUP_ENTRY_SCRIPT,
    STATIC_URL,
    ...TASK51_NAVIGATION_PUBLIC_ASSETS.map((entry) => entry.url),
  ];
  return {
    schema: "wp3-task51-public-startup-lifecycle-plan-v1",
    approvalRequestSha256: TASK51_PUBLIC_STARTUP_REQUEST_SHA256,
    ownerDecision: {
      evidenceRef: "reports/test-owner.json",
      evidenceSha256: "f".repeat(64),
    },
    navigation: {
      fromDocumentUrl: ROOT_URL,
      toDocumentUrl: STARTUP_TARGET,
      maximumCount: 1,
    },
    optionalPublicReadUrls: [...TASK51_OPTIONAL_PUBLIC_READ_URLS],
    staticRequestBounds: urls.map((url, index) => ({
      url,
      minimumCount: index < 3 ? 1 : 0,
      maximumCount:
        TASK51_NAVIGATION_PUBLIC_ASSETS.find((entry) => entry.url === url)
          ?.maximumExceptionalOutcomesPerSession ?? 1,
    })),
    navigationAssets: TASK51_NAVIGATION_PUBLIC_ASSETS.map((entry, index) => ({
      ...entry,
      resourceTypes: [...entry.resourceTypes],
      source: {
        evidenceRef: `reports/test-source-${index}.json`,
        evidenceSha256: "a".repeat(64),
      },
    })),
  };
}
function startupNavigation() {
  return {
    frameId: "main-frame",
    fromLoaderId: "old-loader",
    toLoaderId: "new-loader",
    fromDocumentUrl: ROOT_URL,
    toDocumentUrl: STARTUP_TARGET,
    requestedAt: "2026-09-30T05:10:00.010Z",
    committedAt: "2026-09-30T05:10:00.020Z",
  };
}
function startupProof(unavailable = false) {
  return {
    sequence: 4,
    url: TASK51_NAVIGATION_PUBLIC_ASSETS[0].url,
    resourceType: "image",
    frameId: "main-frame",
    loaderId: "old-loader",
    requestId: "native-asset-1",
    requestObservedAt: "2026-09-30T05:10:00.000Z",
    terminalObservedAt: "2026-09-30T05:10:00.030Z",
    bodyFailureObservedAt: unavailable ? "2026-09-30T05:10:00.040Z" : null,
    terminal: unavailable
      ? "navigation-body-unavailable"
      : "navigation-cancelled",
    httpStatus: unavailable ? 200 : null,
    byteLength: null,
    contentSha256: null,
    nativeBodyObserved: false,
    nativeEvent: unavailable ? "loadingFinished" : "loadingFailed",
    nativeErrorText: unavailable ? null : "net::ERR_ABORTED",
    canceled: unavailable ? null : true,
    bodyReadFailure: unavailable ? "NO_RESOURCE_WITH_GIVEN_IDENTIFIER" : null,
  };
}
function startupSummary(unavailable = false) {
  return {
    schema: "wp3-task51-public-startup-lifecycle-receipt-v1",
    navigation: startupNavigation(),
    exceptionalTerminals: [startupProof(unavailable)],
    publicReadTerminals: [],
    firstAuthenticationRequest: null,
    phaseBoundaries: {
      authenticationStartedAt: null,
      quietStartedAt: null,
      strictStartedAt: null,
    },
    staticTerminalCounts: {
      successfulStatic: 3,
      navigationCancelled: unavailable ? 0 : 1,
      navigationBodyUnavailable: unavailable ? 1 : 0,
    },
  };
}

function stableEntryPlan() {
  const plan = startupPlan();
  plan.staticRequestBounds.find(
    (entry) => entry.url === ROOT_URL
  )!.minimumCount = 0;
  return {
    ...plan,
    stableEntry: {
      schema: "wp3-task51-current-stable-public-login-entry-v1",
      approvalRequestSha256: TASK51_CURRENT_STABLE_ENTRY_REQUEST_SHA256,
      ownerDecision: {
        evidenceRef: "reports/test-stable-owner.json",
        evidenceSha256: "c".repeat(64),
      },
      url: TASK51_CURRENT_STABLE_ENTRY_URL,
    },
  };
}

describe("Task 5.1 independently approved current stable entry (offline only)", () => {
  function contractFixture() {
    const plan = stableEntryPlan();
    const base = executionSourcesFixture().prewarm;
    return {
      ...base,
      warmUrl: TASK51_CURRENT_STABLE_ENTRY_URL,
      documentUrls: [
        TASK51_CURRENT_STABLE_ENTRY_URL,
        ROOT_URL,
        "https://d.xrugc.com/sso",
      ],
      publicStartupLifecycle: plan,
      oidc: null,
      sso: {
        callbackDocumentUrl: "https://d.xrugc.com/sso",
        refreshUrl: "https://d.xrugc.com/api-auth/v1/auth/refresh",
      },
      bootstrapReads: [
        ...TASK51_PUBLIC_STARTUP_READ_IDENTITIES.map(({ url }) => ({
          url,
          minimumCount: 0,
          maximumCount: 1,
          phase: "before-login-public",
          ...(url === TASK51_STABLE_ENTRY_COLD_PUBLIC_READ_URLS[0]
            ? { ssoCallbackPublicReadCount: 1 }
            : {}),
        })),
        ...base.bootstrapReads,
      ],
    };
  }
  function newSupervisor(contract = contractFixture()) {
    return supervisorModule.createTask51PreArmSupervisor({
      prewarmContract: contract,
      staticUrls: [
        ...contract.publicStartupLifecycle.staticRequestBounds.map(
          (entry) => entry.url
        ),
        "https://d.xrugc.com/sso",
      ],
    });
  }
  it("accepts only the exact separate stable owner declaration and direct initial document", () => {
    const contract = contractFixture();
    expect(
      assertTask51CurrentStableEntry(
        contract.publicStartupLifecycle.stableEntry
      )
    ).toBe(true);
    expect(
      assertTask51PublicStartupLifecyclePlan(contract.publicStartupLifecycle)
    ).toBe(true);
    expect(supervisorModule.assertTask51PrewarmContract(contract)).toBe(true);
    expect(
      assertTask51HeadedWarmEntry(TASK51_CURRENT_STABLE_ENTRY_URL, {
        schema: TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA,
        prewarm: contract,
      })
    ).toBe(true);
    expect(() =>
      assertTask51HeadedWarmEntry(ROOT_URL, {
        schema: TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA,
        prewarm: contract,
      })
    ).toThrow();
    expect(() =>
      assertTask51HeadedWarmEntry(TASK51_CURRENT_STABLE_ENTRY_URL, {
        schema: TASK51_EXECUTION_SOURCES_SCHEMA,
        prewarm: contract,
      })
    ).toThrow();
  });
  it.each([
    "sha",
    "schema",
    "url",
    "extra",
    "owner-extra",
    "owner-traversal",
    "same-owner-ref",
    "same-owner-sha",
    "cold-mandatory",
    "warm-optional",
    "runner-optional",
    "missing-stable",
  ])(
    "rejects stable opt-in defect %s rather than changing the old cold policy",
    (fault) => {
      const plan: any = stableEntryPlan();
      if (fault === "sha")
        plan.stableEntry.approvalRequestSha256 = "0".repeat(64);
      if (fault === "schema") plan.stableEntry.schema += "-other";
      if (fault === "url") plan.stableEntry.url = ROOT_URL;
      if (fault === "extra") plan.stableEntry.passed = true;
      if (fault === "owner-extra")
        plan.stableEntry.ownerDecision.approved = true;
      if (fault === "owner-traversal")
        plan.stableEntry.ownerDecision.evidenceRef = "reports/../owner.json";
      if (fault === "same-owner-ref")
        plan.stableEntry.ownerDecision.evidenceRef =
          plan.ownerDecision.evidenceRef;
      if (fault === "same-owner-sha")
        plan.stableEntry.ownerDecision.evidenceSha256 =
          plan.ownerDecision.evidenceSha256;
      if (fault === "cold-mandatory")
        plan.staticRequestBounds[0].minimumCount = 1;
      if (fault === "warm-optional")
        plan.staticRequestBounds[1].minimumCount = 0;
      if (fault === "runner-optional")
        plan.staticRequestBounds[2].minimumCount = 0;
      if (fault === "missing-stable") delete plan.stableEntry;
      expect(() => assertTask51PublicStartupLifecyclePlan(plan)).toThrow();
    }
  );
  it.each([0, 1])(
    "allows actual cold-only initial reads count=%s but still requires the distinct callback read and all auth/quiet phases",
    (initialCount) => {
      const contract = contractFixture(),
        supervisor = newSupervisor(contract);
      let ordinal = 0;
      const complete = (method: string, url: string, type = "xhr") => {
        const id = `stable-${++ordinal}`;
        const decision = supervisor.beginRequest(
          descriptor(id, method, url, type)
        );
        expect(decision.allowed).toBe(true);
        if (decision.category !== "static")
          expect(
            supervisor.finishRequest(id, { httpStatus: 200 }).allowed
          ).toBe(true);
      };
      for (const url of TASK51_STABLE_ENTRY_COLD_PUBLIC_READ_URLS)
        for (let i = 0; i < initialCount; i++) complete("GET", url);
      complete("POST", contract.loginUrl);
      complete("GET", contract.sso.callbackDocumentUrl, "document");
      expect(
        supervisor.beginRequest(
          descriptor(
            "premature-refresh",
            "POST",
            contract.sso.refreshUrl,
            "xhr"
          )
        ).allowed
      ).toBe(false);
      // A rejected production path is latched; use a fresh fixture to prove the complete valid tail.
      const safe = newSupervisor(contract);
      let sequence = 0;
      const done = (method: string, url: string, type = "xhr") => {
        const id = `tail-${++sequence}`;
        const decision = safe.beginRequest(descriptor(id, method, url, type));
        expect(decision.allowed).toBe(true);
        if (decision.category !== "static")
          safe.finishRequest(id, { httpStatus: 200 });
      };
      for (const url of TASK51_STABLE_ENTRY_COLD_PUBLIC_READ_URLS)
        for (let i = 0; i < initialCount; i++) done("GET", url);
      done("POST", contract.loginUrl);
      done("GET", contract.sso.callbackDocumentUrl, "document");
      done("GET", TASK51_STABLE_ENTRY_COLD_PUBLIC_READ_URLS[0]);
      done("POST", contract.sso.refreshUrl);
      for (const read of contract.bootstrapReads.filter(
        (entry) => entry.phase !== "before-login-public"
      ))
        for (let i = 0; i < read.minimumCount; i++) done("GET", read.url);
      safe.enterTransition();
      done("GET", contract.transitionUserInfoUrl);
      safe.enterQuiet(1000);
      expect(() =>
        safe.assertReadyToClaim(
          1000 + supervisorModule.TASK51_AUTH_QUIET_MS - 1
        )
      ).toThrow();
      safe.assertReadyToClaim(1000 + supervisorModule.TASK51_AUTH_QUIET_MS);
      expect(safe.snapshot()).toMatchObject({
        mode: "strict",
        ssoCallbackPublicReadCount: 1,
        ssoRefreshPostCount: 1,
        unexpectedRequestCount: 0,
      });
    }
  );
  it.each([
    "pending",
    "failed",
    "duplicate",
    "unknown-optional",
    "callback-zero",
  ])("retains real request and independent callback fences for %s", (fault) => {
    const contract: any = contractFixture();
    if (fault === "unknown-optional")
      contract.bootstrapReads.push({
        url: "https://d.xrugc.com/api/v1/not-approved",
        phase: "before-login-public",
        minimumCount: 0,
        maximumCount: 1,
      });
    if (fault === "callback-zero")
      contract.bootstrapReads.find(
        (r: any) => r.ssoCallbackPublicReadCount === 1
      ).ssoCallbackPublicReadCount = 0;
    if (["unknown-optional", "callback-zero"].includes(fault)) {
      expect(() =>
        supervisorModule.assertTask51PrewarmContract(contract)
      ).toThrow();
      return;
    }
    const supervisor = newSupervisor(contract),
      url = TASK51_STABLE_ENTRY_COLD_PUBLIC_READ_URLS[1];
    expect(
      supervisor.beginRequest(descriptor("actual-public", "GET", url, "xhr"))
        .allowed
    ).toBe(true);
    if (fault === "failed") supervisor.failRequest("actual-public");
    if (fault === "duplicate") {
      supervisor.finishRequest("actual-public", { httpStatus: 200 });
      expect(
        supervisor.beginRequest(
          descriptor("duplicate-public", "GET", url, "xhr")
        ).allowed
      ).toBe(false);
    }
    expect(
      supervisor.beginRequest(
        descriptor("first-auth", "POST", contract.loginUrl, "xhr")
      ).allowed
    ).toBe(false);
  });
  it("does not add a second user-info bootstrap obligation but still requires the exact successful transition read before quiet", () => {
    const contract = contractFixture();
    contract.bootstrapReads = contract.bootstrapReads.map((entry) =>
      entry.url === contract.transitionUserInfoUrl &&
      entry.phase !== "before-login-public"
        ? { ...entry, minimumCount: 0 }
        : entry
    );
    expect(supervisorModule.assertTask51PrewarmContract(contract)).toBe(true);
    const supervisor = newSupervisor(contract);
    let sequence = 0;
    const done = (method: string, url: string, type = "xhr") => {
      const id = `single-user-info-${++sequence}`;
      const decision = supervisor.beginRequest(
        descriptor(id, method, url, type)
      );
      expect(decision.allowed).toBe(true);
      if (decision.category !== "static")
        expect(supervisor.finishRequest(id, { httpStatus: 200 }).allowed).toBe(
          true
        );
    };
    done("POST", contract.loginUrl);
    done("GET", contract.sso.callbackDocumentUrl, "document");
    done("GET", TASK51_STABLE_ENTRY_COLD_PUBLIC_READ_URLS[0]);
    done("POST", contract.sso.refreshUrl);
    for (const read of contract.bootstrapReads.filter(
      (entry) => entry.phase !== "before-login-public"
    ))
      for (let i = 0; i < read.minimumCount; i++) done("GET", read.url);
    supervisor.enterTransition();
    expect(() => supervisor.enterQuiet(1000)).toThrow(
      "TASK51_PREARM_QUIET_GATE_REJECTED"
    );
    const id = "only-required-user-info";
    expect(
      supervisor.beginRequest(
        descriptor(id, "GET", contract.transitionUserInfoUrl, "xhr")
      ).allowed
    ).toBe(true);
    expect(() => supervisor.enterQuiet(1000)).toThrow(
      "TASK51_PREARM_QUIET_GATE_REJECTED"
    );
    expect(supervisor.finishRequest(id, { httpStatus: 200 }).allowed).toBe(
      true
    );
    supervisor.enterQuiet(1000);
    supervisor.assertReadyToClaim(1000 + supervisorModule.TASK51_AUTH_QUIET_MS);
    expect(supervisor.snapshot()).toMatchObject({
      mode: "strict",
      activeRequestCount: 0,
      unexpectedRequestCount: 0,
    });
  });
  it("requires the d-SPA entry script at full ledger finalization, not at an anonymous warm component tail", () => {
    const plan = stableEntryPlan();
    const ledger = createTask51NetworkLedger({
      runnerUrl: RUNNER_URL,
      currentSources: true,
      staticUrls: plan.staticRequestBounds.map((entry) => entry.url),
      staticRequestCounts: plan.staticRequestBounds.map((entry) => ({
        url: entry.url,
        count: entry.maximumCount,
      })),
      publicStartupLifecycle: plan,
    });
    ledger.beginRequest(
      descriptor("actual-warm-doc", "GET", STARTUP_TARGET, "document")
    );
    ledger.finishRequest("actual-warm-doc", {
      httpStatus: 200,
      byteLength: TASK51_CURRENT_STABLE_ENTRY_RESPONSE.byteLength,
      contentSha256: TASK51_CURRENT_STABLE_ENTRY_RESPONSE.contentSha256,
    });
    ledger.arm(RUNNER_URL);
    completeBusinessLedger(ledger);
    expect(() => ledger.finalize()).toThrow();
  });
  function completedStableReceipt() {
    const plan = stableEntryPlan();
    const ledger = createTask51NetworkLedger({
      runnerUrl: RUNNER_URL,
      currentSources: true,
      staticUrls: plan.staticRequestBounds.map((entry) => entry.url),
      staticRequestCounts: plan.staticRequestBounds.map((entry) => ({
        url: entry.url,
        count: entry.maximumCount,
      })),
      publicStartupLifecycle: plan,
    });
    for (const [index, url] of [
      STARTUP_TARGET,
      STARTUP_ENTRY_SCRIPT,
    ].entries()) {
      const id = `stable-required-${index}`;
      expect(
        ledger.beginRequest(
          descriptor(id, "GET", url, index === 0 ? "document" : "script")
        ).allowed
      ).toBe(true);
      expect(
        ledger.finishRequest(
          id,
          index === 0
            ? {
                httpStatus: 200,
                contentSha256:
                  TASK51_CURRENT_STABLE_ENTRY_RESPONSE.contentSha256,
                byteLength: TASK51_CURRENT_STABLE_ENTRY_RESPONSE.byteLength,
              }
            : staticMetadata(url)
        ).allowed
      ).toBe(true);
    }
    ledger.arm(RUNNER_URL);
    completeBusinessLedger(ledger);
    const network = ledger.finalize();
    return buildTask51NetworkReceipt(
      {
        ...bindingsFor(completedNetwork()),
        executionSourcesSha256: "a".repeat(64),
        staticUrls: plan.staticRequestBounds.map((entry) => entry.url),
        staticUrlManifestSha256: task51StaticUrlManifestSha256(
          plan.staticRequestBounds.map((entry) => entry.url)
        ),
        staticRequestCounts: plan.staticRequestBounds.map((entry) => ({
          url: entry.url,
          count: entry.maximumCount,
        })),
        publicStartupLifecyclePlan: plan,
        publicStartupLifecycle: {
          ...ledger.publicStartupLifecycleSnapshot(),
          // Synthetic offline metadata only: no authentication or production was performed.
          firstAuthenticationRequest: {
            requestId: "first-auth",
            frameId: "main-frame",
            loaderId: "new-loader",
            url: "https://xrugc.com/api-auth/v1/auth/login",
            method: "OPTIONS",
            resourceType: "xhr",
            requestObservedAt: "2026-09-30T05:11:00.000Z",
          },
          phaseBoundaries: {
            authenticationStartedAt: "2026-09-30T05:11:00.000Z",
            quietStartedAt: "2026-09-30T05:12:00.000Z",
            strictStartedAt: "2026-09-30T05:28:00.000Z",
          },
        },
        attestor: {
          candidateContentSha256: "1".repeat(64),
          commitSha: "b".repeat(40),
          treeSha: "2".repeat(40),
          branch: "codex/task51-stage-b-public-bootstrap-contract-20260929",
          releaseEvidenceSha256: "f".repeat(64),
        },
      },
      network,
      FLAGS
    );
  }
  it("round trips the completed stable receipt with an actual pinned warm entry and source-only cold identity", () => {
    const receipt = completedStableReceipt();
    const parsed = parseTask51NetworkReceipt(
      serializeTask51NetworkReceipt(receipt)
    );
    expect(parsed.stableEntry).toEqual(stableEntryPlan().stableEntry);
    expect(parsed.servedRelease.entrySha256).toBe(ROOT_BODY_SHA);
    expect(
      parsed.staticUrlManifest.responses.some((entry) => entry.url === ROOT_URL)
    ).toBe(false);
    expect(
      parsed.staticUrlManifest.responses.find(
        (entry) => entry.url === STARTUP_TARGET
      )
    ).toMatchObject(TASK51_CURRENT_STABLE_ENTRY_RESPONSE);
    expect(
      parsed.network.transcript.find(
        (entry) => entry.resourceType === "document"
      )?.url
    ).toBe(STARTUP_TARGET);
    expect(parsed.network.terminalBusinessRequestCount).toBe(64);
  });
  it.each([
    "missing-opt-in",
    "old-schema",
    "extra-field",
    "warm-hash",
    "warm-length",
    "missing-warm-document",
    "runner-minimum",
  ])("rejects recomputed stable receipt forgery %s", (fault) => {
    const receipt: any = structuredClone(completedStableReceipt());
    if (fault === "missing-opt-in") delete receipt.stableEntry;
    if (fault === "old-schema")
      receipt.schema = "wp3-task51-safe-network-receipt-v2";
    if (fault === "extra-field") receipt.stableEntry.passed = true;
    if (["warm-hash", "warm-length"].includes(fault)) {
      for (const entry of [
        ...receipt.network.transcript,
        ...receipt.staticUrlManifest.responses,
      ].filter((entry) => entry.url === STARTUP_TARGET)) {
        if (fault === "warm-hash") entry.contentSha256 = ROOT_BODY_SHA;
        else entry.byteLength += 1;
      }
    }
    if (fault === "missing-warm-document")
      receipt.network.transcript.find(
        (entry) => entry.url === STARTUP_TARGET
      ).resourceType = "script";
    if (fault === "runner-minimum")
      receipt.staticUrlManifest.requestBounds.find(
        (entry) => entry.url === STARTUP_ENTRY_SCRIPT
      ).minimumCount = 0;
    receipt.network.transcriptSha256 = task51Sha256(
      canonicalTask51Json(receipt.network.transcript)
    );
    expect(() =>
      parseTask51NetworkReceipt(
        canonicalTask51Json({ receipt, receiptSha256: task51Sha256(receipt) })
      )
    ).toThrow();
  });
});

describe("Task 5.1 approved public startup lifecycle (offline only)", () => {
  async function nativeFixture() {
    const events = new Map<string, (event: any) => void>();
    const cdp = {
      on: (name: string, callback: (event: any) => void) =>
        events.set(name, callback),
      send: vi.fn(async () => {}),
      detach: vi.fn(async () => {}),
    };
    const onViolation = vi.fn();
    const page = { context: () => ({ newCDPSession: async () => cdp }) };
    const native = await installTask51PublicStartupLifecycleNative(
      page,
      startupPlan(),
      onViolation,
      executionSourcesFixture().prewarm
    );
    let nativeTimestamp = 600000;
    const wallTimeOffset = Date.now() / 1000 - nativeTimestamp - 1;
    const emit = (name: string, event: any) => {
      nativeTimestamp += 0.002;
      events.get(name)!({
        timestamp: nativeTimestamp,
        wallTime: wallTimeOffset + nativeTimestamp,
        ...event,
      });
    };
    const requested = (
      requestId: string,
      url: string,
      resourceType = "Image",
      loaderId = "old-loader"
    ) =>
      emit("Network.requestWillBeSent", {
        requestId,
        frameId: "main-frame",
        loaderId,
        type: resourceType,
        request: { url, method: "GET" },
      });
    const initialDocument = () =>
      emit("Page.frameNavigated", {
        frame: { id: "main-frame", loaderId: "old-loader", url: ROOT_URL },
      });
    const navigate = () => {
      requested("top-document-2", STARTUP_TARGET, "Document", "new-loader");
      emit("Page.frameNavigated", {
        frame: {
          id: "main-frame",
          loaderId: "new-loader",
          url: STARTUP_TARGET,
        },
      });
    };
    const request = (
      url = TASK51_NAVIGATION_PUBLIC_ASSETS[0].url,
      type = "image"
    ) => ({ url: () => url, method: () => "GET", resourceType: () => type });
    return {
      native,
      emit,
      requested,
      initialDocument,
      navigate,
      request,
      onViolation,
      cdp,
      wallTimeOffset,
    };
  }
  async function navigationDrainFixture() {
    const f = await nativeFixture();
    f.initialDocument();
    f.requested(
      "held-main-navigation",
      STARTUP_TARGET,
      "Document",
      "new-loader"
    );
    const held = f.request(STARTUP_TARGET, "document");
    await f.native.bindRequest(held);
    const prewarm = {
      mode: "bootstrap",
      authenticationStarted: false,
      activeRequestCount: 0,
      unexpectedRequestCount: 0,
    };
    const network = {
      armed: false,
      activeRequestCount: 1,
      failureCount: 0,
      unexpectedRequestCount: 0,
      transcript: [
        {
          url: STARTUP_TARGET,
          category: "static",
          method: "GET",
          resourceType: "document",
          terminal: null,
        },
      ],
    };
    const tasks = new Set();
    return {
      ...f,
      held,
      prewarm,
      network,
      tasks,
      drain: (options = {}) =>
        drainTask51PublicStartupNavigation(
          held,
          f.native,
          { snapshot: () => prewarm },
          { snapshot: () => network },
          tasks,
          options
        ),
    };
  }
  it("holds only the admitted main navigation until prior API, native asset and body tasks really close", async () => {
    const f = await navigationDrainFixture();
    f.requested("draining-asset", TASK51_NAVIGATION_PUBLIC_ASSETS[0].url);
    await f.native.bindRequest(f.request());
    f.prewarm.activeRequestCount = 1;
    f.network.activeRequestCount = 2;
    f.tasks.add("actual-body-hash-task");
    let clock = 0,
      ticks = 0;
    await f.drain({
      now: () => clock,
      pause: async (ms) => {
        clock += ms;
        ticks++;
        if (ticks === 1) f.prewarm.activeRequestCount = 0;
        if (ticks === 2) {
          f.emit("Network.responseReceived", {
            requestId: "draining-asset",
            response: { status: 200 },
          });
          f.emit("Network.loadingFinished", { requestId: "draining-asset" });
          f.network.activeRequestCount = 1;
        }
        if (ticks === 3) f.tasks.clear();
      },
    });
    expect(ticks).toBe(3);
    expect(f.native.navigation()).toBeNull();
    expect(f.native.pendingRequestCount()).toBe(1); // Held document only, not a fabricated terminal.
    expect(f.onViolation).not.toHaveBeenCalled();
  });
  it.each([
    "failureCount",
    "unexpectedRequestCount",
    "armed",
    "missing-held-document",
    "prewarm-failure",
    "strict",
    "auth",
  ])("rejects navigation drain state %s without dispatch", async (kind) => {
    const f = await navigationDrainFixture();
    if (kind === "failureCount") f.network.failureCount = 1;
    if (kind === "unexpectedRequestCount") f.network.unexpectedRequestCount = 1;
    if (kind === "armed") f.network.armed = true;
    if (kind === "missing-held-document") f.network.transcript = [];
    if (kind === "prewarm-failure") f.prewarm.unexpectedRequestCount = 1;
    if (kind === "strict") f.prewarm.mode = "strict";
    if (kind === "auth") f.prewarm.authenticationStarted = true;
    await expect(f.drain()).rejects.toThrow(
      "TASK51_PUBLIC_STARTUP_NAVIGATION_DRAIN_REJECTED"
    );
  });
  it("rejects native first OPTIONS during the hold even before Playwright's POST admission", async () => {
    const f = await navigationDrainFixture();
    f.prewarm.activeRequestCount = 1;
    await expect(
      f.drain({
        pause: async () =>
          f.emit("Network.requestWillBeSent", {
            requestId: "native-first-auth",
            frameId: "main-frame",
            loaderId: "old-loader",
            type: "Preflight",
            request: {
              url: executionSourcesFixture().prewarm.loginUrl,
              method: "OPTIONS",
            },
          }),
      })
    ).rejects.toThrow("TASK51_PUBLIC_STARTUP_NAVIGATION_DISPATCH_REJECTED");
  });
  it("rejects a new-loader pending asset instead of excluding it as the held document", async () => {
    const f = await navigationDrainFixture();
    f.requested(
      "wrong-loader-asset",
      TASK51_NAVIGATION_PUBLIC_ASSETS[0].url,
      "Image",
      "new-loader"
    );
    await f.native.bindRequest(f.request());
    await expect(f.drain()).rejects.toThrow(
      "TASK51_PUBLIC_STARTUP_NAVIGATION_PENDING_REJECTED"
    );
  });
  it("rejects an unclosed pending API at the fixed drain deadline without synthesizing a terminal", async () => {
    const f = await navigationDrainFixture();
    f.prewarm.activeRequestCount = 1;
    let clock = 0;
    await expect(
      f.drain({
        now: () => clock,
        pause: async (ms) => {
          clock += ms;
        },
      })
    ).rejects.toThrow("TASK51_PUBLIC_STARTUP_NAVIGATION_DRAIN_TIMEOUT");
    expect(f.prewarm.activeRequestCount).toBe(1);
    expect(f.native.pendingRequestCount()).toBe(1);
  });
  it.each([false, true])(
    "derives native terminal unavailable=%s only from the real callback state, exact old loader and actual main navigation",
    async (unavailable) => {
      const f = await nativeFixture();
      f.initialDocument();
      f.requested("asset-1", TASK51_NAVIGATION_PUBLIC_ASSETS[0].url);
      const request = f.request();
      expect((await f.native.bindRequest(request)).requestId).toBe("asset-1");
      f.navigate();
      if (unavailable) {
        f.emit("Network.responseReceived", {
          requestId: "asset-1",
          response: { status: 200 },
        });
        f.emit("Network.loadingFinished", { requestId: "asset-1" });
      } else
        f.emit("Network.loadingFailed", {
          requestId: "asset-1",
          errorText: "net::ERR_ABORTED",
          canceled: true,
        });
      const result = await f.native.terminalProof(
        request,
        unavailable
          ? {
              bodyReadFailure: "NO_RESOURCE_WITH_GIVEN_IDENTIFIER",
              bodyFailureObservedAt: new Date().toISOString(),
            }
          : {}
      );
      expect(result.proof.requestId).toBe("asset-1");
      expect(result.proof.loaderId).toBe("old-loader");
      expect(result.proof.contentSha256).toBeNull();
      expect(result.proof.httpStatus).toBe(unavailable ? 200 : null);
      expect(f.native.pendingRequestCount()).toBe(0);
      expect(f.native.phaseBoundaries()).toEqual({
        authenticationStartedAt: null,
        quietStartedAt: null,
        strictStartedAt: null,
      });
      expect(f.onViolation).not.toHaveBeenCalled();
      await f.native.close();
    }
  );
  it("rejects ambiguous same-URL native IDs without guessing latest or first", async () => {
    const f = await nativeFixture();
    f.requested("asset-1", TASK51_NAVIGATION_PUBLIC_ASSETS[0].url);
    f.requested("asset-2", TASK51_NAVIGATION_PUBLIC_ASSETS[0].url);
    await expect(f.native.bindRequest(f.request())).rejects.toThrow(
      "TASK51_PUBLIC_STARTUP_NATIVE_REQUEST_AMBIGUOUS"
    );
    expect(f.onViolation).toHaveBeenCalled();
    await f.native.close();
  });
  it.each([false, true])(
    "uses native event time, not late callback arrival; truly late request=%s",
    async (late) => {
      const f = await nativeFixture();
      f.initialDocument();
      f.emit("Network.requestWillBeSent", {
        requestId: "top-nav",
        frameId: "main-frame",
        loaderId: "new-loader",
        type: "Document",
        timestamp: 600000.1,
        wallTime: f.wallTimeOffset + 600000.1,
        request: { url: STARTUP_TARGET, method: "GET" },
      });
      f.emit("Page.frameNavigated", {
        frame: {
          id: "main-frame",
          loaderId: "new-loader",
          url: STARTUP_TARGET,
        },
      });
      const assetTimestamp = late ? 600000.13 : 600000.03;
      f.emit("Network.requestWillBeSent", {
        requestId: "late-arrival",
        frameId: "main-frame",
        loaderId: "old-loader",
        type: "Image",
        timestamp: assetTimestamp,
        wallTime: f.wallTimeOffset + assetTimestamp,
        request: { url: TASK51_NAVIGATION_PUBLIC_ASSETS[0].url, method: "GET" },
      });
      const request = f.request();
      await f.native.bindRequest(request);
      f.emit("Network.loadingFailed", {
        requestId: "late-arrival",
        timestamp: 600000.14,
        errorText: "net::ERR_ABORTED",
        canceled: true,
      });
      if (late) await expect(f.native.terminalProof(request)).rejects.toThrow();
      else
        expect((await f.native.terminalProof(request)).proof.requestId).toBe(
          "late-arrival"
        );
      await f.native.close();
    }
  );
  it.each([
    "wall-missing",
    "timestamp-nan",
    "timestamp-negative",
    "terminal-missing",
    "terminal-before-request",
  ])(
    "fails closed for an unmapped or invalid native clock %s",
    async (fault) => {
      const f = await nativeFixture();
      const event = {
        requestId: "clock-asset",
        frameId: "main-frame",
        loaderId: "old-loader",
        type: "Image",
        timestamp: 600000.01,
        wallTime: f.wallTimeOffset + 600000.01,
        request: { url: TASK51_NAVIGATION_PUBLIC_ASSETS[0].url, method: "GET" },
      };
      if (fault === "wall-missing") event.wallTime = undefined;
      if (fault === "timestamp-nan") event.timestamp = Number.NaN;
      if (fault === "timestamp-negative") event.timestamp = -1;
      f.emit("Network.requestWillBeSent", event);
      if (fault.startsWith("terminal"))
        f.emit("Network.loadingFailed", {
          requestId: "clock-asset",
          timestamp: fault === "terminal-missing" ? undefined : 600000.001,
          errorText: "net::ERR_ABORTED",
          canceled: true,
        });
      expect(f.onViolation).toHaveBeenCalledWith(
        "TASK51_PUBLIC_STARTUP_NATIVE_CLOCK_REJECTED"
      );
      await f.native.close();
    }
  );
  it("records actual native first OPTIONS/Preflight without inventing a fetch terminal or changing its request type", async () => {
    const f = await nativeFixture();
    const url = executionSourcesFixture().prewarm.loginUrl;
    f.emit("Network.requestWillBeSent", {
      requestId: "native-preflight",
      frameId: "main-frame",
      loaderId: "new-loader",
      type: "Preflight",
      request: { url, method: "OPTIONS" },
    });
    await f.native.noteAuthenticationStarted(
      descriptor("first-post-route", "POST", url, "fetch")
    );
    expect(f.native.firstAuthenticationRequest()).toMatchObject({
      requestId: "native-preflight",
      resourceType: "preflight",
      method: "OPTIONS",
      url,
    });
    expect(f.native.phaseBoundaries().authenticationStartedAt).toBe(
      f.native.firstAuthenticationRequest().requestObservedAt
    );
    await f.native.close();
  });
  it("refuses a different native authentication URL and closes asset exceptions before route admission", async () => {
    const f = await nativeFixture();
    f.initialDocument();
    const url = executionSourcesFixture().prewarm.loginUrl;
    f.emit("Network.requestWillBeSent", {
      requestId: "native-first",
      frameId: "main-frame",
      loaderId: "old-loader",
      type: "Preflight",
      request: { url, method: "OPTIONS" },
    });
    await expect(f.native.terminalProof(f.request())).rejects.toThrow(
      "TASK51_PUBLIC_STARTUP_TERMINAL_REJECTED"
    );
    await expect(
      f.native.noteAuthenticationStarted(
        descriptor(
          "wrong-auth",
          "POST",
          "https://d.xrugc.com/api-auth/v1/auth/login",
          "fetch"
        )
      )
    ).rejects.toThrow("TASK51_PUBLIC_STARTUP_AUTH_BOUNDARY_REJECTED");
    await f.native.close();
  });
  it.each([
    "missing-cancel",
    "after-auth",
    "wrong-loader",
    "unsupported-error",
  ])(
    "rejects native proof with %s even when a fixture reports a terminal",
    async (fault) => {
      const f = await nativeFixture();
      f.initialDocument();
      f.requested(
        "asset-1",
        TASK51_NAVIGATION_PUBLIC_ASSETS[0].url,
        "Image",
        fault === "wrong-loader" ? "new-loader" : "old-loader"
      );
      const request = f.request();
      await f.native.bindRequest(request);
      f.navigate();
      f.emit("Network.loadingFailed", {
        requestId: "asset-1",
        errorText:
          fault === "unsupported-error"
            ? "net::ERR_FAILED"
            : "net::ERR_ABORTED",
        ...(fault === "missing-cancel" ? {} : { canceled: true }),
      });
      if (fault === "after-auth") {
        const url = executionSourcesFixture().prewarm.loginUrl;
        f.emit("Network.requestWillBeSent", {
          requestId: "first-auth",
          frameId: "main-frame",
          loaderId: "new-loader",
          type: "XHR",
          request: { method: "OPTIONS", url },
        });
        await f.native.noteAuthenticationStarted(
          descriptor("auth", "OPTIONS", url, "xhr")
        );
      }
      await expect(f.native.terminalProof(request)).rejects.toThrow();
      await f.native.close();
    }
  );
  it("does not overwrite duplicate terminal metadata or accept a second top-level navigation", async () => {
    const f = await nativeFixture();
    f.initialDocument();
    f.requested("asset-1", TASK51_NAVIGATION_PUBLIC_ASSETS[0].url);
    const request = f.request();
    await f.native.bindRequest(request);
    f.navigate();
    f.emit("Network.loadingFailed", {
      requestId: "asset-1",
      errorText: "net::ERR_ABORTED",
      canceled: true,
    });
    f.emit("Network.loadingFinished", { requestId: "asset-1" });
    expect(f.onViolation).toHaveBeenCalledWith(
      "TASK51_PUBLIC_STARTUP_DUPLICATE_NATIVE_TERMINAL"
    );
    expect((await f.native.terminalProof(request)).proof.nativeEvent).toBe(
      "loadingFailed"
    );
    f.initialDocument();
    f.navigate();
    expect(f.onViolation).toHaveBeenCalledWith(
      "TASK51_PUBLIC_STARTUP_NAVIGATION_REJECTED"
    );
    await f.native.close();
  });
  it("keeps the allowance catalog distinct from observed requests and retains both documents and exact runner script", () => {
    const plan = startupPlan();
    expect(assertTask51PublicStartupLifecyclePlan(plan)).toBe(true);
    expect(
      plan.staticRequestBounds.find((entry) => entry.url === STATIC_URL)
        ?.minimumCount
    ).toBe(0);
    expect(
      plan.staticRequestBounds.find(
        (entry) => entry.url === STARTUP_ENTRY_SCRIPT
      )?.minimumCount
    ).toBe(1);
  });
  it.each([
    "approval",
    "owner-source-ref",
    "owner-source-hash",
    "unknown-url",
    "wrong-hash",
    "type",
    "budget",
    "entry-min",
    "doc-min",
    "ceiling",
    "duplicate-url",
  ])("rejects altered plan %s", (fault) => {
    const value = startupPlan();
    if (fault === "approval") value.approvalRequestSha256 = "0".repeat(64);
    if (fault === "owner-source-ref")
      value.navigationAssets[0].source.evidenceRef =
        value.ownerDecision.evidenceRef;
    if (fault === "owner-source-hash")
      value.navigationAssets[0].source.evidenceSha256 =
        value.ownerDecision.evidenceSha256;
    if (fault === "unknown-url") value.navigationAssets[0].url += "?drift=1";
    if (fault === "wrong-hash")
      value.navigationAssets[0].contentSha256 = "0".repeat(64);
    if (fault === "type") value.navigationAssets[0].resourceTypes = ["script"];
    if (fault === "budget")
      value.navigationAssets[0].maximumExceptionalOutcomesPerSession++;
    if (fault === "entry-min") value.staticRequestBounds[2].minimumCount = 0;
    if (fault === "doc-min") value.staticRequestBounds[0].minimumCount = 0;
    if (fault === "ceiling") value.staticRequestBounds[3].maximumCount = 17;
    if (fault === "duplicate-url")
      value.staticRequestBounds[3].url = value.staticRequestBounds[0].url;
    expect(() => assertTask51PublicStartupLifecyclePlan(value)).toThrow();
  });
  it.each([false, true])(
    "records native cancelled/unavailable=%s as a non-success null-body outcome",
    (unavailable) => {
      const value = startupSummary(unavailable);
      expect(
        assertTask51PublicStartupLifecycleReceipt(value, startupPlan())
      ).toBe(true);
      expect(value.exceptionalTerminals[0].contentSha256).toBeNull();
      expect(value.exceptionalTerminals[0].nativeBodyObserved).toBe(false);
    }
  );
  it.each([
    "source-as-body",
    "unknown-asset",
    "script",
    "wrong-loader",
    "wrong-frame",
    "generic-error",
    "missing-cancel-observation",
    "early-terminal",
    "early-body",
    "after-auth",
    "after-quiet",
    "duplicate-native",
    "duplicate-sequence",
    "budget",
    "unknown-body-field",
  ])("rejects unsupported native terminal %s", (fault) => {
    const value = startupSummary(fault === "early-body");
    const proof = value.exceptionalTerminals[0];
    if (fault === "source-as-body")
      proof.contentSha256 = TASK51_NAVIGATION_PUBLIC_ASSETS[0].contentSha256;
    if (fault === "unknown-asset") proof.url = STATIC_URL;
    if (fault === "script") proof.resourceType = "script";
    if (fault === "wrong-loader") proof.loaderId = "new-loader";
    if (fault === "wrong-frame") proof.frameId = "child-frame";
    if (fault === "generic-error") proof.nativeErrorText = "net::ERR_FAILED";
    if (fault === "missing-cancel-observation") proof.canceled = null;
    if (fault === "early-terminal")
      proof.terminalObservedAt = "2026-09-30T05:10:00.001Z";
    if (fault === "early-body")
      proof.bodyFailureObservedAt = "2026-09-30T05:10:00.021Z";
    if (fault === "after-auth")
      value.phaseBoundaries.authenticationStartedAt =
        "2026-09-30T05:10:00.025Z";
    if (fault === "after-auth")
      value.firstAuthenticationRequest = {
        requestId: "first-auth",
        frameId: "main-frame",
        loaderId: "new-loader",
        url: "https://xrugc.com/api-auth/v1/auth/login",
        method: "OPTIONS",
        resourceType: "xhr",
        requestObservedAt: value.phaseBoundaries.authenticationStartedAt,
      };
    if (fault === "after-quiet")
      value.phaseBoundaries.quietStartedAt = "2026-09-30T05:10:00.025Z";
    if (fault === "duplicate-native" || fault === "duplicate-sequence")
      value.exceptionalTerminals.push({
        ...proof,
        sequence: fault === "duplicate-native" ? 5 : proof.sequence,
        requestId:
          fault === "duplicate-native" ? proof.requestId : "native-asset-2",
      });
    if (fault === "budget")
      for (let index = 0; index < 3; index++)
        value.exceptionalTerminals.push({
          ...proof,
          sequence: 5 + index,
          requestId: `native-asset-${2 + index}`,
        });
    if (fault === "unknown-body-field")
      (proof as any).responseBody = "not-permitted";
    value.staticTerminalCounts.navigationCancelled =
      value.exceptionalTerminals.filter(
        (entry) => entry.terminal === "navigation-cancelled"
      ).length;
    expect(() =>
      assertTask51PublicStartupLifecycleReceipt(value, startupPlan())
    ).toThrow();
  });
  it("compares actual public GET hashes instead of using the anonymous source body as this request", () => {
    const value = startupSummary();
    value.publicReadTerminals = TASK51_PUBLIC_STARTUP_READ_IDENTITIES.map(
      (entry) => ({ ...entry, httpStatus: 200 })
    );
    expect(assertTask51PublicStartupLifecycleReceipt(value)).toBe(true);
    value.publicReadTerminals[0].contentSha256 = "0".repeat(64);
    expect(() => assertTask51PublicStartupLifecycleReceipt(value)).toThrow();
  });
  it.each([
    "net::ERR_BLOCKED_BY_CLIENT",
    "net::ERR_BLOCKED_BY_CLIENT.Inspector",
  ])(
    "accepts only the approved native policy-block spelling %s",
    (errorText) => {
      expect(isTask51PolicyBlockedNativeFailure(errorText, true)).toBe(true);
    }
  );
  it.each([
    null,
    "net::ERR_FAILED",
    "net::ERR_BLOCKED_BY_CLIENT.Inspector.extra",
    "ERR_BLOCKED_BY_CLIENT",
    "net::ERR_BLOCKED_BY_CLIENT.",
  ])("rejects unsupported policy-block spelling %s", (errorText) => {
    expect(isTask51PolicyBlockedNativeFailure(errorText, true)).toBe(false);
  });
  it("does not extend the old no-lifecycle native denial spelling", () => {
    expect(
      isTask51PolicyBlockedNativeFailure("net::ERR_BLOCKED_BY_CLIENT")
    ).toBe(true);
    expect(
      isTask51PolicyBlockedNativeFailure("net::ERR_BLOCKED_BY_CLIENT.Inspector")
    ).toBe(false);
  });
  function newLedger() {
    const plan = startupPlan();
    return {
      plan,
      ledger: createTask51NetworkLedger({
        runnerUrl: RUNNER_URL,
        staticUrls: plan.staticRequestBounds.map((entry) => entry.url),
        currentSources: true,
        staticRequestCounts: plan.staticRequestBounds.map((entry) => ({
          url: entry.url,
          count: entry.maximumCount,
        })),
        publicStartupLifecycle: plan,
      }),
    };
  }
  function completeLifecycleNetwork(unavailable = false) {
    const { plan, ledger } = newLedger();
    for (const [index, url] of [
      ROOT_URL,
      STARTUP_TARGET,
      STARTUP_ENTRY_SCRIPT,
    ].entries()) {
      const id = `required-${index}`;
      expect(
        ledger.beginRequest(
          descriptor(id, "GET", url, index < 2 ? "document" : "script")
        ).allowed
      ).toBe(true);
      ledger.finishRequest(id, staticMetadata(url));
    }
    const proof = startupProof(unavailable);
    expect(
      ledger.beginRequest(
        descriptor("cancelled-image", "GET", proof.url, proof.resourceType)
      ).allowed
    ).toBe(true);
    expect(
      ledger.finishNavigationRequest(
        "cancelled-image",
        proof,
        startupNavigation()
      ).allowed
    ).toBe(true);
    ledger.arm(RUNNER_URL);
    completeBusinessLedger(ledger);
    return { plan, ledger, network: ledger.finalize() };
  }
  it.each([false, true])(
    "finishes actual bounded requests with non-success=%s and does not require unused source URLs to run",
    (unavailable) => {
      const { network, ledger } = completeLifecycleNetwork(unavailable);
      expect(network.staticRequestCount).toBe(4);
      expect(network.expectedStaticRequestCount).toBe(4);
      expect(network.failureCount).toBe(0);
      expect(
        ledger.publicStartupLifecycleSnapshot().exceptionalTerminals
      ).toHaveLength(1);
      expect(network.transcript[3].contentSha256).toBeNull();
    }
  );
  it.each(["default", "missing-entry", "failed-state", "duplicate-terminal"])(
    "retains fail-closed ledger fence for %s",
    (fault) => {
      const { ledger } = fault === "default" ? createLedger() : newLedger();
      if (fault === "default") {
        expect(() =>
          ledger.finishNavigationRequest(
            "unknown",
            startupProof(),
            startupNavigation()
          )
        ).toThrow();
        return;
      }
      if (fault === "missing-entry") {
        ledger.arm(RUNNER_URL);
        completeBusinessLedger(ledger);
        expect(() => ledger.finalize()).toThrow();
        return;
      }
      const proof = startupProof();
      ledger.beginRequest(descriptor("bad-image", "GET", proof.url, "image"));
      if (fault === "failed-state") {
        ledger.failRequest("bad-image");
        expect(() => ledger.arm(RUNNER_URL)).toThrow(
          "TASK51_NETWORK_ARM_FAILED_STATE"
        );
      } else {
        ledger.finishNavigationRequest("bad-image", proof, startupNavigation());
        expect(() =>
          ledger.finishNavigationRequest(
            "bad-image",
            proof,
            startupNavigation()
          )
        ).toThrow();
      }
    }
  );
  it("round trips the complete fixed 64 business requests and typed non-success metadata without synthesizing source responses", () => {
    const { plan, ledger, network } = completeLifecycleNetwork();
    const old = bindingsFor(completedNetwork());
    const lifecycle = {
      ...ledger.publicStartupLifecycleSnapshot(),
      firstAuthenticationRequest: {
        requestId: "first-auth",
        frameId: "main-frame",
        loaderId: "new-loader",
        url: "https://xrugc.com/api-auth/v1/auth/login",
        method: "OPTIONS",
        resourceType: "xhr",
        requestObservedAt: "2026-09-30T05:11:00.000Z",
      },
      phaseBoundaries: {
        authenticationStartedAt: "2026-09-30T05:11:00.000Z",
        quietStartedAt: "2026-09-30T05:12:00.000Z",
        strictStartedAt: "2026-09-30T05:28:00.000Z",
      },
    };
    const receipt = buildTask51NetworkReceipt(
      {
        ...old,
        executionSourcesSha256: "a".repeat(64),
        staticUrls: plan.staticRequestBounds.map((entry) => entry.url),
        staticUrlManifestSha256: task51StaticUrlManifestSha256(
          plan.staticRequestBounds.map((entry) => entry.url)
        ),
        staticRequestCounts: plan.staticRequestBounds.map((entry) => ({
          url: entry.url,
          count: entry.maximumCount,
        })),
        publicStartupLifecyclePlan: plan,
        publicStartupLifecycle: lifecycle,
        attestor: {
          candidateContentSha256: "1".repeat(64),
          commitSha: "b".repeat(40),
          treeSha: "2".repeat(40),
          branch: "codex/task51-stage-b-public-bootstrap-contract-20260929",
          releaseEvidenceSha256: "f".repeat(64),
        },
      },
      network,
      FLAGS
    );
    const parsed = parseTask51NetworkReceipt(
      serializeTask51NetworkReceipt(receipt)
    );
    expect(parsed.network.terminalBusinessRequestCount).toBe(64);
    expect(parsed.staticUrlManifest.responses).toHaveLength(3);
    expect(
      parsed.staticUrlManifest.responses.some(
        (entry) => entry.url === startupProof().url
      )
    ).toBe(false);
    const poisoned = structuredClone(parsed);
    poisoned.staticUrlManifest.responses[0].contentSha256 = "0".repeat(64);
    expect(() => serializeTask51NetworkReceipt(poisoned)).toThrow();
    const offline = structuredClone(parsed);
    offline.publicStartupLifecycle.phaseBoundaries.authenticationStartedAt =
      null;
    expect(() => serializeTask51NetworkReceipt(offline)).toThrow();
    const early = structuredClone(parsed);
    early.publicStartupLifecycle.phaseBoundaries.strictStartedAt =
      "2026-09-30T05:12:00.001Z";
    expect(() => serializeTask51NetworkReceipt(early)).toThrow();
  });
  it("permits zero or one only for the exact three optional before-auth public reads, not for deployment or authenticated reads", () => {
    const plan = startupPlan();
    const contract = {
      ...executionSourcesFixture().prewarm,
      publicStartupLifecycle: plan,
      documentUrls: [ROOT_URL, STARTUP_TARGET],
      bootstrapReads: [
        ...TASK51_OPTIONAL_PUBLIC_READ_URLS.map((url) => ({
          url,
          phase: "before-login-public",
          minimumCount: 0,
          maximumCount: 1,
        })),
        ...TASK51_PUBLIC_STARTUP_READ_IDENTITIES.filter(
          (entry) => !TASK51_OPTIONAL_PUBLIC_READ_URLS.includes(entry.url)
        ).map((entry) => ({
          url: entry.url,
          phase: "before-login-public",
          minimumCount: 1,
          maximumCount: 1,
        })),
        ...executionSourcesFixture().prewarm.bootstrapReads,
      ],
    };
    for (const optionalCount of [0, 1]) {
      const supervisor = supervisorModule.createTask51PreArmSupervisor({
        staticUrls: plan.staticRequestBounds.map((entry) => entry.url),
        prewarmContract: contract,
      });
      let serial = 0;
      for (const read of contract.bootstrapReads.filter(
        (entry) => entry.phase === "before-login-public"
      ))
        for (let i = 0; i < (read.minimumCount || optionalCount); i++) {
          const id = `public-${++serial}`;
          expect(
            supervisor.beginRequest(descriptor(id, "GET", read.url, "xhr"))
              .allowed
          ).toBe(true);
          supervisor.finishRequest(id, { httpStatus: 200 });
        }
      expect(
        supervisor.beginRequest(
          descriptor("first-login", "POST", contract.loginUrl, "xhr")
        ).allowed
      ).toBe(true);
      expect(supervisor.snapshot().authenticationStarted).toBe(true);
    }
    const noPlan = { ...contract };
    delete noPlan.publicStartupLifecycle;
    expect(() =>
      supervisorModule.assertTask51PrewarmContract(noPlan)
    ).toThrow();
    const wrong = structuredClone(contract);
    wrong.bootstrapReads.find((entry) =>
      entry.url.endsWith("/system/deployment")
    )!.minimumCount = 0;
    expect(() => supervisorModule.assertTask51PrewarmContract(wrong)).toThrow();
  });
});

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
  function currentReceipt(actualRunnerUrl = RUNNER_URL) {
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
    ledger.arm(actualRunnerUrl);
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
  it("retains current receipt v3 bindings with the observed page preferences", () => {
    const receipt = currentReceipt(
      `${RUNNER_URL}?lang=en-US&theme=modern-blue`
    );
    const parsed = parseTask51NetworkReceipt(
      serializeTask51NetworkReceipt(receipt)
    );
    expect(parsed.schema).toBe("wp3-task51-safe-network-receipt-v3");
    expect(parsed.staticUrlManifest.urls).toEqual(STATIC_URLS);
    expect(parsed.network.terminalBusinessRequestCount).toBe(64);
    expect(parsed.network.staticRequestCount).toBe(5);
    expect(parsed.executionSourcesSha256).toBe("a".repeat(64));
  });
  it("keeps exact policy-blocked decoration terminals separate from successful network entries", () => {
    const receipt = {
      ...structuredClone(currentReceipt()),
      publicDecorationDenials: supervisorModule.TASK51_OPTIONAL_NEWS_URLS.map(
        (url, index) => ({
          url,
          count: index === 0 ? 1 : 0,
          terminalCount: index === 0 ? 1 : 0,
        })
      ),
    };
    const parsed = parseTask51NetworkReceipt(
      serializeTask51NetworkReceipt(receipt)
    );
    expect(parsed.publicDecorationDenials[0].count).toBe(1);
    expect(parsed.network.failureCount).toBe(0);
    receipt.publicDecorationDenials[0].terminalCount = 0;
    expect(() => serializeTask51NetworkReceipt(receipt)).toThrow();
    receipt.publicDecorationDenials[0].terminalCount = 1;
    receipt.publicDecorationDenials[0].count = 2;
    expect(() => serializeTask51NetworkReceipt(receipt)).toThrow();
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

const decorationDescriptor = (...args: Parameters<typeof descriptor>) => ({
  ...descriptor(...args),
  ...(supervisorModule.TASK51_OPTIONAL_NEWS_URLS.includes(args[2])
    ? { sourceOrigin: "https://xrugc.com" }
    : {}),
});

describe("Task 5.1 exact public decoration denial (offline only)", () => {
  const descriptor = decorationDescriptor;
  const plan = () =>
    supervisorModule.TASK51_OPTIONAL_NEWS_URLS.map((url, index) => ({
      url,
      homepageUrl: "https://xrugc.com/?lang=zh-CN",
      scriptUrl: "https://xrugc.com/assets/useNews-SrGurXgC.js",
      anonymousFailure: {
        evidenceRef: `reports/public-news-failure-${index}.json`,
        evidenceSha256: "a".repeat(64),
      },
      ownerDecision: {
        evidenceRef: "reports/public-news-owner.json",
        evidenceSha256: "b".repeat(64),
      },
    }));

  it.each([null, "https://d.xrugc.com", "https://foreign.invalid", undefined])(
    "rejects a decoration from an unbound or missing source origin: %s",
    (sourceOrigin) => {
      const supervisor = supervisorModule.createTask51PreArmSupervisor({
        staticUrls: [...STATIC_URLS],
        prewarmContract: {
          ...executionSourcesFixture().prewarm,
          publicDecorationDenials: plan(),
        },
      });
      const request = {
        ...descriptor("foreign-news", "GET", plan()[0].url),
        sourceOrigin,
      };
      if (sourceOrigin === undefined) delete request.sourceOrigin;
      expect(supervisor.beginRequest(request)).toMatchObject({
        allowed: false,
        code: "TASK51_PREARM_DECORATION_REJECTED",
      });
      expect(supervisor.snapshot().publicDecorationDenials[0].count).toBe(0);
    }
  );

  it("projects only the declared public decoration Origin header, never credential headers", async () => {
    const reads: string[] = [];
    const request = {
      method: () => "GET",
      url: () => plan()[0].url,
      redirectedFrom: () => null,
      resourceType: () => "xhr",
      headerValue: async (name: string) => {
        reads.push(name);
        if (name !== "origin") throw new Error("PRIVATE_HEADER_READ");
        return "https://xrugc.com";
      },
    };
    expect(
      await createTask51SafeRequestDescriptor(request, "declared", plan())
    ).toMatchObject({ sourceOrigin: "https://xrugc.com" });
    expect(reads).toEqual(["origin"]);
    reads.length = 0;
    expect(
      await createTask51SafeRequestDescriptor(request, "undeclared")
    ).not.toHaveProperty("sourceOrigin");
    expect(reads).toEqual([]);
    expect(
      await createTask51SafeRequestDescriptor(
        { ...request, url: () => `${plan()[0].url}&page=2` },
        "altered",
        plan()
      )
    ).not.toHaveProperty("sourceOrigin");
    expect(reads).toEqual([]);
  });

  it("records only a real before-dispatch rejection terminal, never a synthetic 200", () => {
    const contract = {
      ...executionSourcesFixture().prewarm,
      publicDecorationDenials: plan(),
    };
    const supervisor = supervisorModule.createTask51PreArmSupervisor({
      staticUrls: [...STATIC_URLS],
      prewarmContract: contract,
    });
    const request = descriptor(
      "news-1",
      "GET",
      supervisorModule.TASK51_OPTIONAL_NEWS_URLS[0],
      "xhr"
    );
    const decision = supervisor.beginRequest(request);
    expect(decision).toMatchObject({
      allowed: false,
      category: "public-decoration",
      policyBlocked: true,
    });
    expect(supervisor.snapshot().activeRequestCount).toBe(1);
    expect(supervisor.finishPolicyBlocked(request.id).allowed).toBe(true);
    expect(supervisor.snapshot().publicDecorationDenials[0]).toEqual({
      url: request.url,
      count: 1,
      terminalCount: 1,
    });
    expect(
      supervisor.beginRequest(descriptor("news-2", "GET", request.url)).allowed
    ).toBe(false);
    expect(supervisor.snapshot().unexpectedRequestCount).toBe(1);
  });

  it("rejects POST, altered URL and fabricated success", () => {
    const contract = {
      ...executionSourcesFixture().prewarm,
      publicDecorationDenials: plan(),
    };
    const supervisor = supervisorModule.createTask51PreArmSupervisor({
      staticUrls: [...STATIC_URLS],
      prewarmContract: contract,
    });
    expect(
      supervisor.beginRequest(
        descriptor(
          "altered",
          "GET",
          `${contract.publicDecorationDenials[0].url}&page=2`
        )
      ).allowed
    ).toBe(false);
    const separate = supervisorModule.createTask51PreArmSupervisor({
      staticUrls: [...STATIC_URLS],
      prewarmContract: contract,
    });
    expect(
      separate.beginRequest(
        descriptor("post", "POST", contract.publicDecorationDenials[0].url)
      ).allowed
    ).toBe(false);
    const proper = supervisorModule.createTask51PreArmSupervisor({
      staticUrls: [...STATIC_URLS],
      prewarmContract: contract,
    });
    expect(
      proper.beginRequest(
        descriptor("news", "GET", contract.publicDecorationDenials[0].url)
      ).policyBlocked
    ).toBe(true);
    expect(() =>
      proper.finishRequest("news", { httpStatus: 200 })
    ).not.toThrow();
    expect(proper.snapshot().unexpectedRequestCount).toBe(1);
  });

  it("requires both exact URLs and pinned source bindings", () => {
    const contract = {
      ...executionSourcesFixture().prewarm,
      publicDecorationDenials: plan().slice(0, 1),
    };
    expect(() =>
      supervisorModule.assertTask51PrewarmContract(contract)
    ).toThrow();
    contract.publicDecorationDenials = plan();
    contract.publicDecorationDenials[0].ownerDecision.evidenceSha256 =
      "invalid";
    expect(() =>
      supervisorModule.assertTask51PrewarmContract(contract)
    ).toThrow();
  });

  it.each(["reference", "digest", "traversal"])(
    "rejects anonymous/owner source reuse or unsafe paths: %s",
    (fault) => {
      const contract = {
        ...executionSourcesFixture().prewarm,
        publicDecorationDenials: plan(),
      };
      const entry = contract.publicDecorationDenials[0];
      if (fault === "reference")
        entry.ownerDecision.evidenceRef = entry.anonymousFailure.evidenceRef;
      if (fault === "digest")
        entry.ownerDecision.evidenceSha256 =
          entry.anonymousFailure.evidenceSha256;
      if (fault === "traversal")
        entry.anonymousFailure.evidenceRef = "reports/a/../failure.json";
      expect(() =>
        supervisorModule.assertTask51PrewarmContract(contract)
      ).toThrow("TASK51_PREWARM_CONTRACT_REJECTED");
    }
  );

  it.each(["inflight", "completed"])(
    "rejects news after login preflight starts: %s",
    (terminal) => {
      const contract = {
        ...executionSourcesFixture().prewarm,
        publicDecorationDenials: plan(),
      };
      const supervisor = supervisorModule.createTask51PreArmSupervisor({
        staticUrls: [...STATIC_URLS],
        prewarmContract: contract,
      });
      expect(
        supervisor.beginRequest(
          descriptor(
            "login-preflight",
            "OPTIONS",
            contract.loginUrl,
            "other",
            false,
            "POST",
            "content-type"
          )
        ).allowed
      ).toBe(true);
      if (terminal === "completed")
        supervisor.finishRequest("login-preflight", { httpStatus: 204 });
      expect(
        supervisor.beginRequest(
          descriptor(
            "news-after-preflight",
            "GET",
            contract.publicDecorationDenials[0].url,
            "xhr"
          )
        )
      ).toMatchObject({
        allowed: false,
        code: "TASK51_PREARM_DECORATION_REJECTED",
      });
      expect(supervisor.snapshot().publicDecorationDenials[0].count).toBe(0);
    }
  );

  it("admits the source-bound plan only on the current exception route", () => {
    const source = executionSourcesFixture();
    const { historicalStageANetworkAttestor: _historical, ...current } = source;
    const value = {
      ...current,
      schema: TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA,
      historyException: {
        evidenceRef: "reports/current-history-exception.json",
        evidenceSha256: "c".repeat(64),
      },
      currentBaseline: {
        evidenceRef: "reports/current-baseline.json",
        evidenceSha256: "d".repeat(64),
      },
      prewarm: {
        ...source.prewarm,
        publicDecorationDenials: plan(),
      },
      publicSources: [
        ...source.publicSources,
        {
          url: "https://xrugc.com/?lang=zh-CN",
          evidenceRef: "reports/news-homepage.json",
          evidenceSha256: "e".repeat(64),
        },
        {
          url: "https://xrugc.com/assets/useNews-SrGurXgC.js",
          evidenceRef: "reports/news-script.json",
          evidenceSha256: "f".repeat(64),
        },
      ],
    };
    expect(
      parseTask51StageBExecutionSources(rawSources(value)).value.schema
    ).toBe(TASK51_EXCEPTION_EXECUTION_SOURCES_SCHEMA);
    expect(() =>
      parseTask51StageBExecutionSources(
        rawSources({
          ...source,
          prewarm: value.prewarm,
          publicSources: value.publicSources,
        })
      )
    ).toThrow();
    value.prewarm.publicDecorationDenials[0].scriptUrl =
      "https://xrugc.com/assets/unrelated.js";
    expect(() =>
      parseTask51StageBExecutionSources(rawSources(value))
    ).toThrow();
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

const SSO_DEPLOYMENT_URL = "https://d.xrugc.com/api/v1/system/deployment";

function ssoDeploymentExecutionSourcesFixture() {
  const source = JSON.parse(canonicalTask51Json(ssoExecutionSourcesFixture()));
  source.prewarm.bootstrapReads.push({
    url: SSO_DEPLOYMENT_URL,
    minimumCount: 1,
    maximumCount: 1,
    phase: "before-login-public",
    ssoCallbackPublicReadCount: 1,
  });
  source.currentWeb.networkProvenance.bootstrapReadAllowlist =
    source.prewarm.bootstrapReads.map((entry: { url: string }) => entry.url);
  source.publicSources.push({
    url: SSO_DEPLOYMENT_URL,
    evidenceRef: "reports/public-deployment.json",
    evidenceSha256: "b".repeat(64),
  });
  return source;
}

describe("Task 5.1 normal brand SSO prewarm (offline only)", () => {
  const create = (source = ssoExecutionSourcesFixture()) => {
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
  const reachDeploymentCallback = (f: ReturnType<typeof create>) => {
    f.complete("GET", ROOT_URL, "document");
    f.complete("GET", SSO_DEPLOYMENT_URL, "fetch");
    f.complete("GET", f.contract.documentUrls[1], "document");
    f.publicRead();
    f.login();
    f.callback();
  };
  const finishDeploymentPrewarm = (f: ReturnType<typeof create>) => {
    f.complete("GET", SSO_DEPLOYMENT_URL, "fetch");
    f.complete("POST", f.contract.sso.refreshUrl);
    f.complete("GET", f.contract.transitionUserInfoUrl);
    f.supervisor.enterTransition();
    f.complete("GET", f.contract.transitionUserInfoUrl);
    f.supervisor.enterQuiet(1000);
  };
  it("separately requires the exact deployment GET before login and after callback, through the shared source parser", () => {
    const source = ssoDeploymentExecutionSourcesFixture();
    const parsed = parseTask51StageBExecutionSources(
      `${canonicalTask51Json(source)}\n`
    );
    const f = create(parsed.value);
    reachDeploymentCallback(f);
    finishDeploymentPrewarm(f);
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
      bootstrapReadCount: 4,
      ssoCallbackPublicReadCount: 1,
      ssoRefreshPostCount: 1,
      unexpectedRequestCount: 0,
    });
  });
  it.each([
    "missing-first",
    "pending-first",
    "failed-first-status",
    "failed-first-request",
    "duplicate-first",
    "before-callback",
    "missing-callback-read",
    "pending-callback-read",
    "duplicate-callback-read",
    "failed-callback-status",
    "failed-callback-request",
    "wrong-url",
    "wrong-method",
    "callback-options",
    "private-read-before-refresh",
    "after-refresh",
    "in-quiet",
    "in-strict",
  ])(
    "rejects deployment callback fault %s without exchanging the two budgets",
    (fault) => {
      const f = create(ssoDeploymentExecutionSourcesFixture());
      let decision;
      if (fault === "missing-first") {
        f.publicRead();
        decision = f.begin("POST", f.contract.loginUrl).decision;
      } else if (
        [
          "pending-first",
          "failed-first-status",
          "failed-first-request",
        ].includes(fault)
      ) {
        f.publicRead();
        const pending = f.begin("GET", SSO_DEPLOYMENT_URL, "fetch");
        expect(pending.decision.allowed).toBe(true);
        if (fault === "failed-first-status")
          expect(
            f.supervisor.finishRequest(pending.request.id, { httpStatus: 500 })
              .allowed
          ).toBe(false);
        if (fault === "failed-first-request")
          expect(f.supervisor.failRequest(pending.request.id).allowed).toBe(
            false
          );
        decision = f.begin("POST", f.contract.loginUrl).decision;
      } else if (fault === "duplicate-first") {
        f.publicRead();
        f.complete("GET", SSO_DEPLOYMENT_URL, "fetch");
        decision = f.begin("GET", SSO_DEPLOYMENT_URL, "fetch").decision;
      } else if (fault === "before-callback") {
        f.complete("GET", SSO_DEPLOYMENT_URL, "fetch");
        f.publicRead();
        f.login();
        decision = f.begin("GET", SSO_DEPLOYMENT_URL, "fetch").decision;
      } else {
        reachDeploymentCallback(f);
        if (fault === "missing-callback-read") {
          decision = f.begin("POST", f.contract.sso.refreshUrl).decision;
        } else if (
          [
            "pending-callback-read",
            "failed-callback-status",
            "failed-callback-request",
          ].includes(fault)
        ) {
          const pending = f.begin("GET", SSO_DEPLOYMENT_URL, "fetch");
          expect(pending.decision.allowed).toBe(true);
          if (fault === "failed-callback-status")
            expect(
              f.supervisor.finishRequest(pending.request.id, {
                httpStatus: 500,
              }).allowed
            ).toBe(false);
          if (fault === "failed-callback-request")
            expect(f.supervisor.failRequest(pending.request.id).allowed).toBe(
              false
            );
          decision = f.begin("POST", f.contract.sso.refreshUrl).decision;
        } else if (fault === "wrong-url") {
          decision = f.begin("GET", `${SSO_DEPLOYMENT_URL}?retry=1`).decision;
        } else if (fault === "wrong-method") {
          decision = f.begin("POST", SSO_DEPLOYMENT_URL).decision;
        } else if (fault === "callback-options") {
          decision = f.supervisor.beginRequest(
            descriptor(
              "callback-options",
              "OPTIONS",
              SSO_DEPLOYMENT_URL,
              "other",
              false,
              "GET",
              "content-type"
            )
          );
        } else if (fault === "private-read-before-refresh") {
          f.complete("GET", SSO_DEPLOYMENT_URL, "fetch");
          decision = f.begin("GET", f.contract.transitionUserInfoUrl).decision;
        } else if (fault === "duplicate-callback-read") {
          f.complete("GET", SSO_DEPLOYMENT_URL, "fetch");
          decision = f.begin("GET", SSO_DEPLOYMENT_URL, "fetch").decision;
        } else if (fault === "after-refresh") {
          f.complete("GET", SSO_DEPLOYMENT_URL, "fetch");
          f.complete("POST", f.contract.sso.refreshUrl);
          decision = f.begin("GET", SSO_DEPLOYMENT_URL, "fetch").decision;
        } else {
          finishDeploymentPrewarm(f);
          if (fault === "in-strict")
            f.supervisor.assertReadyToClaim(
              1000 + supervisorModule.TASK51_AUTH_QUIET_MS
            );
          decision = f.begin("GET", SSO_DEPLOYMENT_URL, "fetch").decision;
        }
      }
      expect(decision.allowed).toBe(false);
      // A failed or duplicate attempt cannot be followed by an otherwise valid
      // login, callback read or refresh to repair this opted-in run in place.
      expect(f.begin("POST", f.contract.loginUrl).decision.allowed).toBe(false);
      expect(f.begin("GET", SSO_DEPLOYMENT_URL, "fetch").decision.allowed).toBe(
        false
      );
      expect(f.begin("POST", f.contract.sso.refreshUrl).decision.allowed).toBe(
        false
      );
      expect(() => f.supervisor.enterTransition()).toThrow();
    }
  );
  it.each([
    "zero",
    "two",
    "string",
    "null",
    "wrong-url",
    "query",
    "wrong-phase",
    "missing-phase",
    "missing-sso",
    "first-count-two",
    "first-count-zero",
    "missing-public-source",
    "duplicate-url",
    "extra-field",
    "total-over-budget",
  ])(
    "rejects invalid owner-bound deployment declaration %s in the shared parser",
    (fault) => {
      const source = ssoDeploymentExecutionSourcesFixture();
      const entry = source.prewarm.bootstrapReads.at(-1);
      if (fault === "zero") entry.ssoCallbackPublicReadCount = 0;
      if (fault === "two") entry.ssoCallbackPublicReadCount = 2;
      if (fault === "string") entry.ssoCallbackPublicReadCount = "1";
      if (fault === "null") entry.ssoCallbackPublicReadCount = null;
      if (fault === "wrong-url")
        entry.url = "https://xrugc.com/api/v1/system/deployment";
      if (fault === "query") entry.url += "?retry=1";
      if (fault === "wrong-phase") entry.phase = "after-authentication";
      if (fault === "missing-phase") delete entry.phase;
      if (fault === "missing-sso") delete source.prewarm.sso;
      if (fault === "first-count-two")
        entry.minimumCount = entry.maximumCount = 2;
      if (fault === "first-count-zero") entry.minimumCount = 0;
      if (fault === "missing-public-source")
        source.publicSources = source.publicSources.filter(
          (value: { url: string }) => value.url !== SSO_DEPLOYMENT_URL
        );
      if (fault === "duplicate-url")
        source.prewarm.bootstrapReads.push({ ...entry });
      if (fault === "extra-field") entry.anyPhase = true;
      if (fault === "total-over-budget") {
        // 128 ordinary GETs fit; the separately granted callback GET must
        // still be included in the existing 128-request resource ceiling.
        for (let i = 0; i < 8; i++)
          source.prewarm.bootstrapReads.push({
            url: `https://d.xrugc.com/api/v1/read-${i}`,
            minimumCount: 0,
            maximumCount: i === 7 ? 13 : 16,
            phase: "after-authentication",
          });
      }
      source.currentWeb.networkProvenance.bootstrapReadAllowlist =
        source.prewarm.bootstrapReads.map(
          (value: { url: string }) => value.url
        );
      expect(() =>
        parseTask51StageBExecutionSources(`${canonicalTask51Json(source)}\n`)
      ).toThrow();
    }
  );
  it("does not grant a callback repeat when the optional declaration is absent", () => {
    const source = ssoDeploymentExecutionSourcesFixture();
    delete source.prewarm.bootstrapReads.at(-1).ssoCallbackPublicReadCount;
    const parsed = parseTask51StageBExecutionSources(
      `${canonicalTask51Json(source)}\n`
    );
    const f = create(parsed.value);
    reachDeploymentCallback(f);
    expect(f.begin("GET", SSO_DEPLOYMENT_URL, "fetch").decision.allowed).toBe(
      false
    );
  });
  it("observes the public deployment GET without reading credentials or bodies", async () => {
    const forbidden = vi.fn(() => {
      throw new Error("auth material must not be read");
    });
    const request = {
      method: () => "GET",
      url: () => SSO_DEPLOYMENT_URL,
      resourceType: () => "fetch",
      redirectedFrom: () => null,
      headerValue: forbidden,
      allHeaders: forbidden,
      headers: forbidden,
      postData: forbidden,
      postDataJSON: forbidden,
    };
    expect(
      await createTask51SafeRequestDescriptor(request, "deployment")
    ).toMatchObject({
      method: "GET",
      url: SSO_DEPLOYMENT_URL,
      corsRequestHeaderNames: null,
      corsRequestMethod: null,
    });
    expect(forbidden).not.toHaveBeenCalled();
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
  it("accepts only existing language/theme page preferences across entry, arm and receipt", async () => {
    const languages = ["zh-CN", "en-US", "ja-JP", "th-TH", "zh-TW"];
    const themes = [
      "modern-blue",
      "deep-space",
      "cyber-tech",
      "edu-friendly",
      "neo-brutalism",
      "minimal-pure",
    ];
    const urls = [
      RUNNER_URL,
      ...languages.map((lang) => `${RUNNER_URL}?lang=${lang}`),
      ...themes.map((theme) => `${RUNNER_URL}?theme=${theme}`),
      ...languages.flatMap((lang) =>
        themes.flatMap((theme) => [
          `${RUNNER_URL}?lang=${lang}&theme=${theme}`,
          `${RUNNER_URL}?theme=${theme}&lang=${lang}`,
        ])
      ),
    ];
    for (const url of urls) {
      expect(isTask51RunnerPageUrl(url)).toBe(true);
      const attached = vi.fn().mockResolvedValue(undefined);
      const evaluate = vi.fn().mockResolvedValue(undefined);
      const waitForURL = vi.fn(async (predicate: (url: URL) => boolean) => {
        expect(predicate(new URL(url))).toBe(true);
        expect(predicate(new URL(`${RUNNER_URL}?token=unexpected`))).toBe(
          false
        );
      });
      await pushTask51RunnerThroughVueRouter(
        { evaluate, waitForURL, locator: () => ({ waitFor: attached }) },
        { race: (promise: Promise<unknown>) => promise }
      );
      expect(evaluate.mock.calls[0][1]).toBe(
        TASK51_NETWORK_CONSTANTS.runnerPath
      );
      expect(attached).toHaveBeenCalledWith({
        state: "attached",
        timeout: 60_000,
      });
      const network = completedNetwork(STATIC_URLS, url);
      const receipt = buildTask51NetworkReceipt(
        bindingsFor(network),
        network,
        FLAGS
      );
      expect(
        parseTask51NetworkReceipt(serializeTask51NetworkReceipt(receipt))
          .network.terminalBusinessRequestCount
      ).toBe(64);
    }
    // The page preference allowance cannot grant a document or API request.
    const { ledger } = createLedger();
    expect(
      ledger.beginRequest(
        descriptor("runner-document", "GET", urls.at(-1)!, "document")
      ).allowed
    ).toBe(false);
    expect(() =>
      validateTask51StaticAllowlist(urls.at(-1)!, STATIC_URLS)
    ).toThrow("TASK51_NETWORK_RUNNER_URL_REJECTED");
  });

  it("rejects noncanonical, unknown, duplicate and credential-bearing runner parameters", () => {
    const rejected = [
      null,
      undefined,
      1,
      {},
      "https://other.example/internal/task51/memory-isolated-runner",
      "http://d.xrugc.com/internal/task51/memory-isolated-runner",
      RUNNER_URL.replace("d.xrugc.com", "root@d.xrugc.com"),
      `${RUNNER_URL}/`,
      `${RUNNER_URL}#`,
      `${RUNNER_URL}#fragment`,
      `${RUNNER_URL}?`,
      `${RUNNER_URL}?lang=xx-XX`,
      `${RUNNER_URL}?theme=unknown`,
      `${RUNNER_URL}?lang=`,
      `${RUNNER_URL}?theme=`,
      `${RUNNER_URL}?lang`,
      `${RUNNER_URL}?lang=en-US&lang=en-US`,
      `${RUNNER_URL}?theme=modern-blue&theme=deep-space`,
      `${RUNNER_URL}?lang=en-US&token=secret`,
      `${RUNNER_URL}?redirect=/home`,
      `${RUNNER_URL}?%6cang=en-US`,
      `${RUNNER_URL}?lang=%65n-US`,
      `${RUNNER_URL}?lang=en-US&`,
      `${RUNNER_URL}?lang=en-US&&theme=modern-blue`,
      `${RUNNER_URL}?lang=en-US=extra`,
      `${RUNNER_URL}?theme=modern-blue%0A`,
      `${RUNNER_URL} `,
      `${RUNNER_URL}?lang=en-US#`,
    ];
    for (const url of rejected) {
      expect(isTask51RunnerPageUrl(url)).toBe(false);
      const { ledger } = createLedger();
      expect(() => ledger.arm(url)).toThrow("TASK51_NETWORK_ARM_URL_MISMATCH");
    }
  });

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
