import { describe, expect, it, vi } from "vitest";

import {
  TASK51_BOOTSTRAP_READ_ALLOWLIST,
  TASK51_BUSINESS_LEDGER,
  TASK51_EXPECTED_BUSINESS_REQUEST_COUNT,
  TASK51_NETWORK_CONSTANTS,
  createTask51NetworkLedger,
} from "../../../tools/identity/task51-network-attestor-ledger.mjs";
import {
  buildTask51NetworkReceipt,
  canonicalTask51Json,
  parseTask51NetworkAttestorReleaseEvidence,
  parseTask51NetworkReceipt,
  serializeTask51NetworkReceipt,
  task51Sha256,
  task51StaticResponseManifestSha256,
  task51StaticUrlManifestSha256,
} from "../../../tools/identity/task51-network-receipt.mjs";
import { TASK51_RUNNER_URL } from "../../../tools/identity/task51-stage-b-supervisor.mjs";

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
      developCandidateTreeSha: "5".repeat(40),
      developCommitSha: "6".repeat(40),
      developTreeSha: "2".repeat(40),
      evidenceRef: "reports/task51-attestor.json",
      mainCandidateContentSha256: "1".repeat(64),
      mainCandidateTreeSha: "5".repeat(40),
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
      publishCandidateTreeSha: "5".repeat(40),
      publishCommitSha: "b".repeat(40),
      publishTreeSha: "2".repeat(40),
    },
    schema: "wp3-task51-stage-a-network-attestor-release-evidence-v1",
    status: "PASS",
    webStageAReleaseEvidenceSha256: "9".repeat(64),
  };
  return `${canonicalTask51Json(value)}\n`;
}

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
