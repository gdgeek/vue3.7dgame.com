import { describe, expect, it } from "vitest";

import {
  API_ORIGIN_BY_NODE,
  CLOCK_SKEW_MS,
  EVIDENCE_LEDGER,
  EVIDENCE_PATHS,
  EVIDENCE_RESPONSE_MAX_BYTES,
  EXTERNAL_GATE_KEYS,
  LOGIN_HOST_BY_ROLE,
  LOGIN_PATH,
  LOGIN_RESPONSE_MAX_BYTES,
  LOGOUT_PATH,
  MIN_TOKEN_TTL_MS,
  NODES,
  PAGE_DEADLINE_MS,
  PREFLIGHT_GATE_KEYS,
  PRODUCTION_ORIGIN,
  PROTOCOL,
  REQUEST_TIMEOUT_MS,
  ROLES,
  RUNNER_FRAGMENT_SCHEMA,
  STAGE_B_COORDINATOR_ORIGIN,
  STAGE_B_MIN_REMAINING_EXECUTION_MS,
  STAGE_B_EXECUTION_EVIDENCE_SCHEMA,
  STAGE_B_GLOBAL_CLAIM_RECEIPT_SCHEMA,
  advanceRunnerState,
  assertSafeRunnerOutput,
  buildEvidenceLedger,
  burnLedgerCell,
  canTransitionRunnerState,
  createEvidenceLedgerRuntime,
  externalGatesPass,
  encodeAsciiSortedCanonicalJson,
  encodeTask51RunnerFragment,
  isExactExternalGate,
  isExactIsoInstant,
  isExactTask51RunnerFragment,
  isSafeRunnerOutput,
  parseStageBExecutionEvidence,
  parseStageBGlobalClaimReceipt,
  preflightGatesPass,
  type ExternalGate,
  type PreflightGate,
  type RunnerSafeEvent,
  type RunnerState,
  type SafeCellResult,
  type Task51RunnerFragment,
} from "@/services/task51/memoryRunnerProtocol";

const exactExternalGates = (): ExternalGate =>
  Object.fromEntries(
    EXTERNAL_GATE_KEYS.map((key) => [key, true])
  ) as ExternalGate;

describe("Task 5.1 strict RFC3339 timestamps", () => {
  it.each([
    "0000-01-01T00:00:00Z",
    "2026-02-29T10:00:00Z",
    "2026-02-30T10:00:00Z",
    "2026-13-01T10:00:00Z",
    "2026-01-01T24:00:00Z",
    "2026-01-01T10:60:00Z",
    "2026-01-01T10:00:60Z",
    "2026-01-01T10:00:00+14:01",
  ])("rejects nonexistent or out-of-range instant %s", (value) => {
    expect(isExactIsoInstant(value)).toBe(false);
  });

  it.each([
    "2024-02-29T10:00:00Z",
    "2026-01-01T10:00:00.123+14:00",
    "2026-01-01T10:00:00-08:00",
  ])("accepts valid instant %s", (value) => {
    expect(isExactIsoInstant(value)).toBe(true);
  });
});

const exactPreflightGates = (): PreflightGate =>
  Object.fromEntries(
    PREFLIGHT_GATE_KEYS.map((key) => [key, true])
  ) as PreflightGate;
const ROLE_SUBJECT_DIGESTS = {
  user: "1".repeat(64),
  manager: "2".repeat(64),
  admin: "3".repeat(64),
  root: "4".repeat(64),
} as const;
const MATRIX_SUBJECT_DIGEST =
  "1b139876aca0c101bcb6649e4c042885eadfd4e7f807a4a923995e4f097a84cd";

const stageBBinding = () => ({
  approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-19700101",
  authorizedControlPostCount: 1,
  authorizedLogicalGetCount: 56,
  authorizedLoginCount: 4,
  authorizedLogoutCount: 4,
  claimCapabilitySha256: "d".repeat(64),
  coordinatorOrigin: STAGE_B_COORDINATOR_ORIGIN,
  coordinatorServerPublishSha: "e".repeat(40),
  currentWindowOnly: true,
  executionId: "task51-stage-b-execution-0001",
  expiresAt: "1970-01-01T00:59:00.000Z",
  issuedAt: "1969-12-31T23:59:00.000Z",
  oneShot: true,
  productionDirectMatrixAuthorizedCellCount: 256,
  productionDirectMatrixEvidenceRef:
    "reports/task51-production-direct-matrix-test-fixture.json",
  productionDirectMatrixSchema: "wp3-task51-production-direct-matrix-v1",
  productionDirectMatrixSubjectDigest: MATRIX_SUBJECT_DIGEST,
  protocol: PROTOCOL,
  schema: STAGE_B_EXECUTION_EVIDENCE_SCHEMA,
  stageAApprovalRef: "WP3-REL-TASK51-MEMORY-RUNNER-STAGE-A-19700101",
  stageACoordinatorServerReleaseEvidenceSha256: "a".repeat(64),
  stageANetworkAttestorReleaseEvidenceSha256: "b".repeat(64),
  stageAReleaseEvidenceSha256: "c".repeat(64),
  status: "APPROVED",
});

const stageBClaimReceipt = (stageBSha256 = "a".repeat(64)) => ({
  approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-19700101",
  claimCount: 1,
  claimedAt: "1970-01-01T00:00:00.000Z",
  coordinatorOrigin: STAGE_B_COORDINATOR_ORIGIN,
  coordinatorServerPublishSha: "e".repeat(40),
  executionId: "task51-stage-b-execution-0001",
  expiresAt: "1970-01-01T00:59:00.000Z",
  globalExactOneClaimed: true,
  schema: STAGE_B_GLOBAL_CLAIM_RECEIPT_SCHEMA,
  stageBExecutionEvidenceSha256: stageBSha256,
  state: "CLAIMED",
});

const fragmentCell = (index: number): SafeCellResult => {
  const cell = EVIDENCE_LEDGER[index];
  const organizationDenied =
    cell.path === "/v1/organization/list" &&
    (cell.role === "user" || cell.role === "manager");
  return {
    baselineParityMatched: cell.phase === "shadow" ? true : null,
    crossNodeIdentityMatched:
      cell.path === "/v1/organization/list" ||
      (cell.phase === "readiness" && cell.node === "xrteeth")
        ? null
        : true,
    expectedDecisionMatched: true,
    httpStatus: organizationDenied ? 403 : 200,
    ledgerKey: cell.key,
    node: cell.node,
    path: cell.path,
    phase: cell.phase,
    role: cell.role,
    roleSubjectDigest: ROLE_SUBJECT_DIGESTS[cell.role],
    roleExact: cell.path === "/v1/organization/list" ? null : true,
    schemaPassed: true,
    transportPassed: true,
  };
};

const exactFragment = (): Task51RunnerFragment => ({
  approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-19700101",
  counts: {
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
  },
  executionId: "task51-stage-b-execution-0001",
  exportedAt: "1970-01-01T00:00:00.000Z",
  flags: {
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
  },
  protocol: PROTOCOL,
  productionDirectMatrixEvidenceRef:
    "reports/task51-production-direct-matrix-test-fixture.json",
  productionDirectMatrixEvidenceSha256: "9".repeat(64),
  productionDirectMatrixSubjectDigest: MATRIX_SUBJECT_DIGEST,
  safeCellResults: EVIDENCE_LEDGER.map((_cell, index) => fragmentCell(index)),
  schema: RUNNER_FRAGMENT_SCHEMA,
  stageBClaimedAt: "1970-01-01T00:00:00.000Z",
  stageBExecutionEvidenceSha256: "a".repeat(64),
  stageBGlobalClaimReceiptSha256: "b".repeat(64),
});

const sha256Hex = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await globalThis.crypto.subtle.digest("SHA-256", bytes.slice().buffer)
    ),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");

describe("Task 5.1 memory runner fixed protocol", () => {
  it("fixes the protocol, origin, paths and security limits", () => {
    expect(PROTOCOL).toBe("wp3-task51-memory-runner-v1");
    expect(PRODUCTION_ORIGIN).toBe("https://d.xrugc.com");
    expect(STAGE_B_COORDINATOR_ORIGIN).toBe("https://api.xrteeth.com");
    expect(LOGIN_PATH).toBe("/v1/auth/login");
    expect(LOGOUT_PATH).toBe("/v1/auth/logout");
    expect(REQUEST_TIMEOUT_MS).toBe(15_000);
    expect(PAGE_DEADLINE_MS).toBe(30 * 60 * 1_000);
    expect(STAGE_B_MIN_REMAINING_EXECUTION_MS).toBe(
      PAGE_DEADLINE_MS + REQUEST_TIMEOUT_MS
    );
    expect(CLOCK_SKEW_MS).toBe(120 * 1_000);
    expect(MIN_TOKEN_TTL_MS).toBe(35 * 60 * 1_000);
    expect(LOGIN_RESPONSE_MAX_BYTES).toBe(64 * 1_024);
    expect(EVIDENCE_RESPONSE_MAX_BYTES).toBe(8 * 1_024 * 1_024);
  });

  it("fixes role order, node origins and login-host mapping", () => {
    expect(ROLES).toEqual(["user", "manager", "admin", "root"]);
    expect(NODES).toEqual(["xrteeth", "tmrpp"]);
    expect(API_ORIGIN_BY_NODE).toEqual({
      xrteeth: "https://api.xrteeth.com",
      tmrpp: "https://api.tmrpp.com",
    });
    expect(LOGIN_HOST_BY_ROLE).toEqual({
      user: "https://api.xrteeth.com",
      manager: "https://api.xrteeth.com",
      admin: "https://api.tmrpp.com",
      root: "https://api.tmrpp.com",
    });
    expect(EVIDENCE_PATHS).toEqual([
      "/v1/user/info",
      "/v1/plugin/verify-token",
      "/v1/organization/list",
    ]);
  });
});

describe("Task 5.1 runner state machine", () => {
  const normalPath: RunnerState[] = [
    "BOOTSTRAP",
    "PREFLIGHT",
    "CAPTURE_USER",
    "CAPTURE_MANAGER",
    "CAPTURE_ADMIN",
    "CAPTURE_ROOT",
    "READINESS_VERIFIED",
    "BASELINE_READY",
    "XRTEETH_SHADOW_RUNNING",
    "WAIT_XRTEETH_RESTORED",
    "TMRPP_SHADOW_RUNNING",
    "COMPLETE",
    "CLEARING",
    "CLEARED",
  ];

  it("accepts only the fixed normal order", () => {
    for (let index = 0; index < normalPath.length - 1; index += 1) {
      const from = normalPath[index];
      const to = normalPath[index + 1];
      expect(canTransitionRunnerState(from, to)).toBe(true);
      expect(advanceRunnerState(from, to)).toBe(to);
    }
  });

  it("allows an operational state to fail terminal, then only clear", () => {
    expect(canTransitionRunnerState("CAPTURE_ADMIN", "FAILED_TERMINAL")).toBe(
      true
    );
    expect(advanceRunnerState("FAILED_TERMINAL", "CLEARING")).toBe("CLEARING");
    expect(advanceRunnerState("CLEARING", "CLEARED")).toBe("CLEARED");
  });

  it.each([
    ["BOOTSTRAP", "CAPTURE_MANAGER"],
    ["PREFLIGHT", "CAPTURE_MANAGER"],
    ["CAPTURE_USER", "CAPTURE_USER"],
    ["BASELINE_READY", "TMRPP_SHADOW_RUNNING"],
    ["WAIT_XRTEETH_RESTORED", "BASELINE_READY"],
    ["FAILED_TERMINAL", "CAPTURE_USER"],
    ["CLEARED", "BOOTSTRAP"],
    ["CLEARED", "FAILED_TERMINAL"],
  ] as const)("rejects transition %s -> %s", (from, to) => {
    expect(canTransitionRunnerState(from, to)).toBe(false);
    expect(() => advanceRunnerState(from, to)).toThrow(
      "TASK51_INVALID_STATE_TRANSITION"
    );
  });
});

describe("Task 5.1 fixed evidence ledger", () => {
  it("contains exactly 56 unique cells with the approved phase totals", () => {
    const cells = buildEvidenceLedger();
    expect(cells).toHaveLength(56);
    expect(new Set(cells.map(({ key }) => key))).toHaveLength(56);
    expect(cells.filter(({ phase }) => phase === "readiness")).toHaveLength(8);
    expect(cells.filter(({ phase }) => phase === "baseline")).toHaveLength(24);
    expect(cells.filter(({ phase }) => phase === "shadow")).toHaveLength(24);
  });

  it("covers each node 28 times, each role 14 times and only fixed paths", () => {
    for (const node of NODES) {
      expect(EVIDENCE_LEDGER.filter((cell) => cell.node === node)).toHaveLength(
        28
      );
    }
    for (const role of ROLES) {
      expect(EVIDENCE_LEDGER.filter((cell) => cell.role === role)).toHaveLength(
        14
      );
    }
    expect(
      EVIDENCE_LEDGER.filter((cell) => cell.path === "/v1/user/info")
    ).toHaveLength(24);
    expect(
      EVIDENCE_LEDGER.filter((cell) => cell.path === "/v1/plugin/verify-token")
    ).toHaveLength(16);
    expect(
      EVIDENCE_LEDGER.filter((cell) => cell.path === "/v1/organization/list")
    ).toHaveLength(16);
  });

  it("orders readiness, baseline, xrteeth shadow and tmrpp shadow", () => {
    expect(EVIDENCE_LEDGER[0].key).toBe("readiness|xrteeth|user|/v1/user/info");
    expect(EVIDENCE_LEDGER[7].key).toBe("readiness|tmrpp|root|/v1/user/info");
    expect(EVIDENCE_LEDGER[8].key).toBe("baseline|xrteeth|user|/v1/user/info");
    expect(EVIDENCE_LEDGER[32].key).toBe("shadow|xrteeth|user|/v1/user/info");
    expect(EVIDENCE_LEDGER[44].key).toBe("shadow|tmrpp|user|/v1/user/info");
    expect(EVIDENCE_LEDGER[55].key).toBe(
      "shadow|tmrpp|root|/v1/organization/list"
    );
  });

  it("burns a known cell once and never resets it after failure", () => {
    const runtime = createEvidenceLedgerRuntime();
    const key = EVIDENCE_LEDGER[0].key;
    expect(burnLedgerCell(runtime, key)).toBe(1);
    expect(runtime.burnedKeys.has(key)).toBe(true);
    expect(() => burnLedgerCell(runtime, key)).toThrow(
      "TASK51_DUPLICATE_LEDGER_CELL"
    );
    expect(runtime.burnedKeys.has(key)).toBe(true);
  });

  it("rejects a key outside the fixed ledger", () => {
    const runtime = createEvidenceLedgerRuntime();
    expect(() =>
      burnLedgerCell(runtime, "baseline|xrteeth|user|/v1/not-approved" as never)
    ).toThrow("TASK51_UNKNOWN_LEDGER_CELL");
    expect(runtime.burnedKeys.size).toBe(0);
  });
});

describe("Task 5.1 exact external gates", () => {
  it("requires the exact release and one-shot window gates before capture", () => {
    expect(PREFLIGHT_GATE_KEYS).toEqual([
      ...EXTERNAL_GATE_KEYS,
      "stageAWebReleasePassedExact",
      "stageBOneShotApprovalExact",
      "stageBWindowCurrent",
      "stageBGlobalClaimExact",
    ]);
    expect(preflightGatesPass(exactPreflightGates())).toBe(true);

    for (const key of PREFLIGHT_GATE_KEYS) {
      expect(
        preflightGatesPass({ ...exactPreflightGates(), [key]: false })
      ).toBe(false);
    }
    expect(
      preflightGatesPass({ ...exactPreflightGates(), unexpected: true })
    ).toBe(false);
  });

  it("passes only when every exact gate is primitive true", () => {
    const gates = exactExternalGates();
    expect(isExactExternalGate(gates)).toBe(true);
    expect(externalGatesPass(gates)).toBe(true);
  });

  it.each(EXTERNAL_GATE_KEYS)("fails closed when %s is false", (key) => {
    const gates = { ...exactExternalGates(), [key]: false };
    expect(isExactExternalGate(gates)).toBe(true);
    expect(externalGatesPass(gates)).toBe(false);
  });

  it("rejects missing, extra and truthy non-boolean gates", () => {
    const { exactProductionOrigin: _missing, ...missing } =
      exactExternalGates();
    expect(isExactExternalGate(missing)).toBe(false);
    expect(
      isExactExternalGate({ ...exactExternalGates(), unexpected: true })
    ).toBe(false);
    expect(
      isExactExternalGate({
        ...exactExternalGates(),
        exactProductionOrigin: 1,
      })
    ).toBe(false);
    expect(
      isExactExternalGate({
        ...exactExternalGates(),
        exactProductionOrigin: "true",
      })
    ).toBe(false);
  });
});

describe("Task 5.1 canonical Stage B binding and runner fragment", () => {
  it.each([
    "reports/task51-production-direct-matrix.md",
    "reports//task51-production-direct-matrix.json",
    "reports/./task51-production-direct-matrix.json",
    "reports/../task51-production-direct-matrix.json",
  ])("rejects unsafe Production matrix evidence ref %s", (evidenceRef) => {
    expect(() =>
      parseStageBExecutionEvidence(
        encodeAsciiSortedCanonicalJson({
          ...stageBBinding(),
          productionDirectMatrixEvidenceRef: evidenceRef,
        }),
        0
      )
    ).toThrow("TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED");
    expect(
      isExactTask51RunnerFragment({
        ...exactFragment(),
        productionDirectMatrixEvidenceRef: evidenceRef,
      })
    ).toBe(false);
  });

  it("accepts only exact canonical raw Stage B evidence in its current window", () => {
    const raw = encodeAsciiSortedCanonicalJson(stageBBinding());
    expect(parseStageBExecutionEvidence(raw, 0)).toEqual(stageBBinding());
    const offsetBinding = {
      ...stageBBinding(),
      expiresAt: "1970-01-01T08:59:00+08:00",
      issuedAt: "1970-01-01T07:59:00+08:00",
    };
    expect(
      parseStageBExecutionEvidence(
        encodeAsciiSortedCanonicalJson(offsetBinding),
        0
      )
    ).toEqual(offsetBinding);
    const expiresAtMs = Date.parse(stageBBinding().expiresAt);
    expect(
      parseStageBExecutionEvidence(
        raw,
        expiresAtMs - STAGE_B_MIN_REMAINING_EXECUTION_MS
      )
    ).toEqual(stageBBinding());
    expect(() =>
      parseStageBExecutionEvidence(
        raw,
        expiresAtMs - STAGE_B_MIN_REMAINING_EXECUTION_MS + 1
      )
    ).toThrow("TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED");

    for (const drift of [
      { approvalRef: "APR-Task51-0001" },
      { executionId: "task51-execution-0001" },
      { stageAApprovalRef: "APR-Task51-StageA-0001" },
    ]) {
      expect(() =>
        parseStageBExecutionEvidence(
          encodeAsciiSortedCanonicalJson({ ...stageBBinding(), ...drift }),
          0
        )
      ).toThrow("TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED");
    }

    const binding = stageBBinding();
    const nonCanonical = new TextEncoder().encode(
      `${JSON.stringify({
        schema: binding.schema,
        approvalRef: binding.approvalRef,
        authorizedControlPostCount: binding.authorizedControlPostCount,
        authorizedLogicalGetCount: binding.authorizedLogicalGetCount,
        authorizedLoginCount: binding.authorizedLoginCount,
        authorizedLogoutCount: binding.authorizedLogoutCount,
        claimCapabilitySha256: binding.claimCapabilitySha256,
        coordinatorOrigin: binding.coordinatorOrigin,
        coordinatorServerPublishSha: binding.coordinatorServerPublishSha,
        currentWindowOnly: binding.currentWindowOnly,
        executionId: binding.executionId,
        expiresAt: binding.expiresAt,
        issuedAt: binding.issuedAt,
        oneShot: binding.oneShot,
        protocol: binding.protocol,
        stageAApprovalRef: binding.stageAApprovalRef,
        stageAReleaseEvidenceSha256: binding.stageAReleaseEvidenceSha256,
        status: binding.status,
      })}\n`
    );
    expect(() => parseStageBExecutionEvidence(nonCanonical, 0)).toThrow(
      "TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED"
    );
    expect(() =>
      parseStageBExecutionEvidence(
        encodeAsciiSortedCanonicalJson({ ...stageBBinding(), extra: true }),
        0
      )
    ).toThrow("TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED");
    expect(() => parseStageBExecutionEvidence(raw, 3_540_000)).toThrow(
      "TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED"
    );
  });

  it("binds an exact server claim receipt to B before credentials can exist", async () => {
    const binding = stageBBinding();
    const rawBinding = encodeAsciiSortedCanonicalJson(binding);
    const bindingSha256 = await sha256Hex(rawBinding);
    const receipt = stageBClaimReceipt(bindingSha256);
    const rawReceipt = encodeAsciiSortedCanonicalJson(receipt);

    expect(
      parseStageBGlobalClaimReceipt(rawReceipt, binding, bindingSha256, 0)
    ).toEqual(receipt);

    for (const drift of [
      { claimCount: 2 },
      { globalExactOneClaimed: false },
      { state: "ISSUED" },
      { executionId: "task51-stage-b-other-execution" },
      { stageBExecutionEvidenceSha256: "f".repeat(64) },
      { coordinatorOrigin: "https://api.tmrpp.com" },
      { coordinatorServerPublishSha: "f".repeat(40) },
      { claimedAt: "1970-01-01T00:59:00.000Z" },
    ]) {
      expect(() =>
        parseStageBGlobalClaimReceipt(
          encodeAsciiSortedCanonicalJson({ ...receipt, ...drift }),
          binding,
          bindingSha256,
          0
        )
      ).toThrow("TASK51_STAGE_B_GLOBAL_CLAIM_RECEIPT_REJECTED");
    }

    expect(() =>
      parseStageBGlobalClaimReceipt(
        encodeAsciiSortedCanonicalJson({ ...receipt, unexpected: true }),
        binding,
        bindingSha256,
        0
      )
    ).toThrow("TASK51_STAGE_B_GLOBAL_CLAIM_RECEIPT_REJECTED");
    expect(() =>
      parseStageBGlobalClaimReceipt(
        rawReceipt,
        binding,
        bindingSha256,
        Date.parse(binding.expiresAt) - STAGE_B_MIN_REMAINING_EXECUTION_MS + 1
      )
    ).toThrow("TASK51_STAGE_B_GLOBAL_CLAIM_RECEIPT_REJECTED");
  });

  it("encodes the exact fragment with ASCII-sorted keys and exactly one LF", () => {
    const fragment = exactFragment();
    expect(isExactTask51RunnerFragment(fragment)).toBe(true);
    const raw = encodeTask51RunnerFragment(fragment);
    const text = new TextDecoder().decode(raw);

    expect(text.startsWith('{"approvalRef":')).toBe(true);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect(JSON.parse(text)).toEqual(fragment);
    expect(encodeTask51RunnerFragment(fragment)).toEqual(raw);
  });

  it("matches the independent root B/F canonical cross-vector", async () => {
    const rawStageB = new TextEncoder().encode(
      '{"approvalRef":"WP3-TASK51-MEMORY-RUNNER-STAGE-B-20260828","authorizedControlPostCount":1,"authorizedLogicalGetCount":56,"authorizedLoginCount":4,"authorizedLogoutCount":4,"claimCapabilitySha256":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","coordinatorOrigin":"https://api.xrteeth.com","coordinatorServerPublishSha":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","currentWindowOnly":true,"executionId":"task51-stage-b-test-window-20260828","expiresAt":"2026-08-28T11:00:00+08:00","issuedAt":"2026-08-28T09:55:00+08:00","oneShot":true,"productionDirectMatrixAuthorizedCellCount":256,"productionDirectMatrixEvidenceRef":"reports/task51-production-direct-matrix-test-fixture.json","productionDirectMatrixSchema":"wp3-task51-production-direct-matrix-v1","productionDirectMatrixSubjectDigest":"1b139876aca0c101bcb6649e4c042885eadfd4e7f807a4a923995e4f097a84cd","protocol":"wp3-task51-memory-runner-v1","schema":"wp3-task51-stage-b-execution-approval-v3","stageAApprovalRef":"WP3-REL-TASK51-MEMORY-RUNNER-STAGE-A-20260828","stageACoordinatorServerReleaseEvidenceSha256":"74b5d68c0ff8cba56d0c6e1d9aa9ee4cb1486bbf35de26a9b0c88c1379102e16","stageANetworkAttestorReleaseEvidenceSha256":"026d8509c1662a0c8f7149bac0d9c48be0808876aae6cd125d2b5dc73cbab11c","stageAReleaseEvidenceSha256":"7247f6454c70630ab8ec2e0e0a510988bfd80c863c32029864de54d6bdc2ba27","status":"APPROVED"}\n'
    );
    expect(
      parseStageBExecutionEvidence(
        rawStageB,
        Date.parse("2026-08-28T10:20:00+08:00")
      )
    ).toMatchObject({
      approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-20260828",
      executionId: "task51-stage-b-test-window-20260828",
    });
    expect(await sha256Hex(rawStageB)).toBe(
      "6418ea824491b280a0703adbb3762b7451bed99d6cc5550168fb638aab18d14e"
    );

    const rawFragment = encodeTask51RunnerFragment({
      ...exactFragment(),
      approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-20260828",
      executionId: "task51-stage-b-test-window-20260828",
      exportedAt: "2026-08-28T10:20:00+08:00",
      stageBClaimedAt: "2026-08-28T10:00:00+08:00",
      stageBExecutionEvidenceSha256:
        "6418ea824491b280a0703adbb3762b7451bed99d6cc5550168fb638aab18d14e",
      stageBGlobalClaimReceiptSha256: "b".repeat(64),
      productionDirectMatrixEvidenceRef:
        "reports/task51-production-direct-matrix-test-fixture.json",
      productionDirectMatrixEvidenceSha256:
        "fa3bb10b471772835f3fe0bf169f37cc17e989c342cb939ebcb74098e4696ec2",
      productionDirectMatrixSubjectDigest: MATRIX_SUBJECT_DIGEST,
    });
    expect(rawFragment.byteLength).toBe(23_368);
    expect(await sha256Hex(rawFragment)).toBe(
      "0a16008bb7ade82c15bd4f68b80d28a15230d9e780ceef40f0aadd7aae22f424"
    );
  });

  it("rejects fragment key drift and non-exact completion counters", () => {
    expect(
      isExactTask51RunnerFragment({ ...exactFragment(), unexpected: true })
    ).toBe(false);
    expect(
      isExactTask51RunnerFragment({
        ...exactFragment(),
        counts: { ...exactFragment().counts, captureCount: 3 },
      })
    ).toBe(false);
    expect(
      isExactTask51RunnerFragment({
        ...exactFragment(),
        safeCellResults: exactFragment().safeCellResults.map((cell, index) =>
          index === 0 ? { ...cell, transportPassed: false } : cell
        ),
      })
    ).toBe(false);
    expect(
      isExactTask51RunnerFragment({
        ...exactFragment(),
        safeCellResults: exactFragment().safeCellResults.map((cell, index) =>
          index === 0 ? { ...cell, httpStatus: 201 } : cell
        ),
      })
    ).toBe(false);
  });
});

describe("Task 5.1 safe page output", () => {
  const safeCellEvent: RunnerSafeEvent = {
    protocol: PROTOCOL,
    type: "cell-result",
    cell: {
      ledgerKey: "shadow|xrteeth|root|/v1/organization/list",
      phase: "shadow",
      node: "xrteeth",
      role: "root",
      roleSubjectDigest: ROLE_SUBJECT_DIGESTS.root,
      path: "/v1/organization/list",
      httpStatus: 200,
      transportPassed: true,
      schemaPassed: true,
      expectedDecisionMatched: true,
      baselineParityMatched: true,
      roleExact: null,
      crossNodeIdentityMatched: null,
    },
  };

  it("accepts the fixed safe event projection", () => {
    expect(isSafeRunnerOutput(safeCellEvent)).toBe(true);
    expect(() => assertSafeRunnerOutput(safeCellEvent)).not.toThrow();
  });

  it.each([
    "password",
    "accessToken",
    "refresh_token",
    "authorization",
    "cookie",
    "credential",
    "username",
    "profile",
    "subjectDigest",
    "rawBody",
    "responseBody",
  ])("rejects forbidden output key %s", (key) => {
    expect(isSafeRunnerOutput({ ...safeCellEvent, [key]: "test-only" })).toBe(
      false
    );
  });

  it("rejects bearer/JWT-shaped strings, binary data, cycles and non-finite numbers", () => {
    expect(isSafeRunnerOutput({ value: "Bearer TEST_ONLY" })).toBe(false);
    expect(isSafeRunnerOutput({ value: ["a", "b", "c"].join(".") })).toBe(
      false
    );
    expect(isSafeRunnerOutput({ value: new Uint8Array([1, 2, 3]) })).toBe(
      false
    );
    expect(isSafeRunnerOutput({ value: Number.NaN })).toBe(false);

    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(isSafeRunnerOutput(cycle)).toBe(false);
  });

  it("throws a categorical error without echoing unsafe material", () => {
    expect(() => assertSafeRunnerOutput({ password: "test-only" })).toThrow(
      "TASK51_UNSAFE_RUNNER_OUTPUT"
    );
  });
});
