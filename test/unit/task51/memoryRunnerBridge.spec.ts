import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EVIDENCE_LEDGER,
  EXTERNAL_GATE_KEYS,
  FINAL_RESTORE_GATE_KEYS,
  OPERATOR_AUTH_QUIET_PERIOD_MS,
  PAGE_DEADLINE_MS,
  PREFLIGHT_GATE_KEYS,
  PRODUCTION_DIRECT_MATRIX_PHASES,
  PRODUCTION_DIRECT_MATRIX_SCHEMA,
  PRODUCTION_DIRECT_MATRIX_SURFACES,
  PRODUCTION_ORIGIN,
  PROTOCOL,
  ROLES,
  STAGE_B_COORDINATOR_ORIGIN,
  STAGE_B_EXECUTION_EVIDENCE_MAX_BYTES,
  STAGE_B_EXECUTION_EVIDENCE_SCHEMA,
  STAGE_B_GLOBAL_CLAIM_RECEIPT_MAX_BYTES,
  STAGE_B_GLOBAL_CLAIM_RECEIPT_SCHEMA,
  STAGE_B_MIN_REMAINING_EXECUTION_MS,
  SHADOW_OPEN_GATE_KEYS,
  XRTEETH_RESTORE_GATE_KEYS,
  encodeAsciiSortedCanonicalJson,
  type EvidencePhase,
  type ExternalGate,
  type FinalRestoreGate,
  type PreflightGate,
  type RunnerFailureCode,
  type RunnerNode,
  type RunnerRole,
  type RunnerState,
  type SafeCellResult,
  type ShadowOpenGate,
  type XrteethRestoreGate,
} from "@/services/task51/memoryRunnerProtocol";
import {
  createTask51MemoryRunnerBridge,
  type BridgeDependencies,
  type WorkerLike,
} from "@/services/task51/memoryRunnerBridge";

type TimerEntry = {
  callback: () => void;
  delay: number;
  active: boolean;
};

type ServiceWorkerRegistrationState =
  | "none"
  | "installing"
  | "waiting"
  | "active";

type HarnessOptions = {
  origin?: string;
  serviceWorkerController?: unknown | null;
  serviceWorkerPresent?: boolean;
  serviceWorkerRegistrationState?: ServiceWorkerRegistrationState;
  serviceWorkerRegistrationSnapshots?: readonly ServiceWorkerRegistrationState[];
  heldServiceWorkerRegistrationChecks?: readonly number[];
  lockAvailable?: boolean;
  locksPresent?: boolean;
  holdLockRequestCompletion?: boolean;
  performanceObserverAvailable?: boolean;
};

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly postMessage = vi.fn(
    (_message: unknown, _transfer?: Transferable[]) => undefined
  );
  readonly terminate = vi.fn(() => undefined);

  emit(message: unknown) {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }
}

function createTimerHarness() {
  let nextId = 1;
  const entries = new Map<number, TimerEntry>();

  const setTimer = ((handler: TimerHandler, timeout = 0) => {
    if (typeof handler !== "function") {
      throw new Error("TEST_ONLY_NON_FUNCTION_TIMER");
    }
    const id = nextId;
    nextId += 1;
    entries.set(id, {
      callback: () => handler(),
      delay: Number(timeout),
      active: true,
    });
    return id as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  const clearTimer = ((timerId?: ReturnType<typeof setTimeout>) => {
    if (timerId === undefined) return;
    const entry = entries.get(Number(timerId));
    if (entry) entry.active = false;
  }) as typeof clearTimeout;

  const fire = (delay: number) => {
    let fired = 0;
    for (const entry of entries.values()) {
      if (!entry.active || entry.delay !== delay) continue;
      entry.active = false;
      entry.callback();
      fired += 1;
    }
    return fired;
  };

  return { clearTimer, entries, fire, setTimer };
}

function fakePort(): MessagePort {
  return {
    onmessage: null,
    onmessageerror: null,
    postMessage: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
  } as unknown as MessagePort;
}

function exactTrueGate<const Key extends string>(keys: readonly Key[]) {
  return Object.fromEntries(keys.map((key) => [key, true])) as Readonly<
    Record<Key, boolean>
  >;
}

const ROLE_SUBJECT_DIGESTS = Object.freeze({
  user: "1".repeat(64),
  manager: "2".repeat(64),
  admin: "3".repeat(64),
  root: "4".repeat(64),
} as const);
const PRODUCTION_DIRECT_MATRIX_EVIDENCE_REF =
  "reports/task51-production-direct-matrix-test-fixture.json";

function productionDirectMatrixSubjectDigest() {
  return fakeSha256Hex(encodeAsciiSortedCanonicalJson(ROLE_SUBJECT_DIGESTS));
}

function rawStageBBinding(
  issuedAt = "1970-01-01T00:00:00.000Z",
  expiresAt = "1970-01-01T02:00:00.000Z"
) {
  return encodeAsciiSortedCanonicalJson({
    approvalRef: "WP3-TASK51-MEMORY-RUNNER-STAGE-B-19700101",
    authorizedControlPostCount: 1,
    authorizedLogicalGetCount: 56,
    authorizedLoginCount: 4,
    authorizedLogoutCount: 4,
    claimCapabilitySha256: "d".repeat(64),
    coordinatorOrigin: STAGE_B_COORDINATOR_ORIGIN,
    coordinatorServerPublishSha: "e".repeat(40),
    currentWindowOnly: true,
    executionId: "task51-stage-b-bridge-test-execution",
    expiresAt,
    issuedAt,
    oneShot: true,
    productionDirectMatrixAuthorizedCellCount: 256,
    productionDirectMatrixEvidenceRef: PRODUCTION_DIRECT_MATRIX_EVIDENCE_REF,
    productionDirectMatrixSchema: PRODUCTION_DIRECT_MATRIX_SCHEMA,
    productionDirectMatrixSubjectDigest: productionDirectMatrixSubjectDigest(),
    protocol: PROTOCOL,
    schema: STAGE_B_EXECUTION_EVIDENCE_SCHEMA,
    stageAApprovalRef: "WP3-REL-TASK51-MEMORY-RUNNER-STAGE-A-19700101",
    stageACoordinatorServerReleaseEvidenceSha256: "a".repeat(64),
    stageANetworkAttestorReleaseEvidenceSha256: "b".repeat(64),
    stageAReleaseEvidenceSha256: "c".repeat(64),
    status: "APPROVED",
  });
}

function fakeSha256(bytes: Uint8Array) {
  const output = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    output[index % output.length] ^= bytes[index];
  }
  return output;
}

function fakeSha256Hex(bytes: Uint8Array) {
  return Array.from(fakeSha256(bytes), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function rawProductionDirectMatrix(
  rawStageB = rawStageBBinding(),
  overrides: Readonly<Record<string, unknown>> = {}
) {
  const stageB = JSON.parse(new TextDecoder().decode(rawStageB)) as Record<
    string,
    unknown
  >;
  const nodePhaseTimes = {
    xrteeth: {
      before: "1970-01-01T00:15:01.000Z",
      hit: "1970-01-01T00:15:02.000Z",
      restore: "1970-01-01T00:15:03.000Z",
      after: "1970-01-01T00:15:04.000Z",
    },
    tmrpp: {
      before: "1970-01-01T00:15:05.000Z",
      hit: "1970-01-01T00:15:06.000Z",
      restore: "1970-01-01T00:15:07.000Z",
      after: "1970-01-01T00:15:08.000Z",
    },
  } as const;
  const nodes = ["xrteeth", "tmrpp"] as const;
  return encodeAsciiSortedCanonicalJson({
    approvalRef: stageB.approvalRef,
    capturedAt: "1970-01-01T00:15:30.000Z",
    cellCount: 256,
    cells: nodes.flatMap((node) =>
      PRODUCTION_DIRECT_MATRIX_PHASES.flatMap((phase) =>
        ROLES.flatMap((role) =>
          PRODUCTION_DIRECT_MATRIX_SURFACES.map((surface) => ({
            currentProduction: true,
            directObserved: true,
            evidenceRef: `reports/task51-${node}-${phase}-${role}-${surface}.json`,
            expectedDecisionMatched: true,
            fallbackApplied: false,
            fresh: true,
            ledgerKey: `${node}|${phase}|${role}|${surface}`,
            legacyResponseParityMatched: true,
            mutationCount: 0,
            node,
            ordinaryUserPrivilegedDenied:
              role === "user" &&
              [
                "userManagement",
                "systemAdmin",
                "campusOrganization",
                "iframe",
              ].includes(surface),
            permissionUnionApplied: false,
            phase,
            role,
            roleSubjectDigest: ROLE_SUBJECT_DIGESTS[role],
            rootBreakGlassPreserved: role === "root",
            surface,
            unexpected5xxCount: 0,
          }))
        )
      )
    ),
    environment: "production",
    executionId: stageB.executionId,
    fallbackAppliedCount: 0,
    mutationCount: 0,
    nodeCount: 2,
    nodePhases: nodes.flatMap((node) =>
      PRODUCTION_DIRECT_MATRIX_PHASES.map((phase, phaseIndex) => ({
        authzMode: phase === "hit" ? "shadow" : "legacy",
        backendHealthy: true,
        backendPublishShaExact: true,
        backendRouteIntegrationEnabled: phase === "hit",
        evidenceRef: `reports/task51-${node}-${phase}-node.json`,
        expectedBackendPublishSha: "a".repeat(40),
        expectedIdentityPublishSha: "b".repeat(40),
        fallbackAppliedCount: 0,
        identityHealthy: true,
        identityPublishShaExact: true,
        legacyResponseParityMatched: true,
        mutationCount: 0,
        node,
        observedAt: nodePhaseTimes[node][phase],
        observedBackendPublishSha: "a".repeat(40),
        observedIdentityPublishSha: "b".repeat(40),
        ordinal: phaseIndex + 1,
        permissionUnionAppliedCount: 0,
        phase,
        publicHealthPassed: true,
        responseProvider: "legacy",
        runtimeExact: true,
        sourceExact: true,
        unexpected5xxCount: 0,
      }))
    ),
    ordinaryUserNegativePassed: true,
    permissionUnionAppliedCount: 0,
    phaseCount: 4,
    roleCount: 4,
    roleSubjectDigests: ROLE_SUBJECT_DIGESTS,
    rootBreakGlassPassed: true,
    schema: PRODUCTION_DIRECT_MATRIX_SCHEMA,
    stageBExecutionEvidenceSha256: fakeSha256Hex(rawStageB),
    subjectCount: 256,
    subjectDigest: productionDirectMatrixSubjectDigest(),
    surfaceCount: 8,
    unexpected5xxCount: 0,
    ...overrides,
  });
}

function rawStageBClaimReceipt(
  rawStageB = rawStageBBinding(),
  claimedAt = "1970-01-01T00:15:00.000Z",
  overrides: Readonly<Record<string, unknown>> = {}
) {
  const stageB = JSON.parse(new TextDecoder().decode(rawStageB)) as Record<
    string,
    unknown
  >;
  return encodeAsciiSortedCanonicalJson({
    approvalRef: stageB.approvalRef,
    claimCount: 1,
    claimedAt,
    coordinatorOrigin: stageB.coordinatorOrigin,
    coordinatorServerPublishSha: stageB.coordinatorServerPublishSha,
    executionId: stageB.executionId,
    expiresAt: stageB.expiresAt,
    globalExactOneClaimed: true,
    schema: STAGE_B_GLOBAL_CLAIM_RECEIPT_SCHEMA,
    stageBExecutionEvidenceSha256: fakeSha256Hex(rawStageB),
    state: "CLAIMED",
    ...overrides,
  });
}

function testInput(value: string): HTMLInputElement {
  return { value } as HTMLInputElement;
}

async function flushMicrotasks(turns = 20) {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

async function waitUntil(predicate: () => boolean) {
  for (let index = 0; index < 30; index += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("TEST_ONLY_WAIT_CONDITION_NOT_REACHED");
}

function compactStates(states: readonly RunnerState[]): RunnerState[] {
  return states.filter(
    (state, index) => index === 0 || state !== states[index - 1]
  );
}

function createHarness(options: HarnessOptions = {}) {
  let nowMs = 0;
  let activityEpoch = 0;
  let activityListener:
    | Parameters<BridgeDependencies["subscribeActivity"]>[0]
    | null = null;
  let resourceCallback:
    | ((entries: readonly PerformanceEntry[]) => void)
    | null = null;
  let lockCallbackReleasedCount = 0;
  let lockRequestCompletedCount = 0;
  let finishHeldLockRequest: (() => void) | null = null;
  let serviceWorkerRegistrationState =
    options.serviceWorkerRegistrationState ?? "none";
  let registrationCheckCount = 0;
  const registrationSnapshots = [
    ...(options.serviceWorkerRegistrationSnapshots ?? []),
  ];
  const heldRegistrationChecks = new Map<
    number,
    { promise: Promise<void>; release: () => void }
  >();

  for (const callNumber of options.heldServiceWorkerRegistrationChecks ?? []) {
    let release = () => undefined;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    heldRegistrationChecks.set(callNumber, { promise, release });
  }

  const heldLockRequest = new Promise<void>((resolve) => {
    finishHeldLockRequest = resolve;
  });
  const timerHarness = createTimerHarness();
  const vaultWorker = new FakeWorker();
  const loginWorkers: FakeWorker[] = [];
  const workerCreationOrder: string[] = [];
  const messageChannels: MessageChannel[] = [];
  const resourceRecords: PerformanceEntry[] = [];
  const windowTarget = new EventTarget() as unknown as Window;
  const documentTarget = new EventTarget() as unknown as Document;
  Object.defineProperty(documentTarget, "visibilityState", {
    configurable: true,
    value: "visible",
  });

  const getRegistrations = vi.fn(async () => {
    registrationCheckCount += 1;
    await heldRegistrationChecks.get(registrationCheckCount)?.promise;
    const state =
      registrationSnapshots.shift() ?? serviceWorkerRegistrationState;
    return state === "none"
      ? []
      : [
          {
            active: state === "active" ? {} : null,
            waiting: state === "waiting" ? {} : null,
            installing: state === "installing" ? {} : null,
          },
        ];
  });
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: options.serviceWorkerController ?? null,
    getRegistrations,
  }) as NonNullable<BridgeDependencies["serviceWorker"]>;

  const lockRequest: NonNullable<BridgeDependencies["locks"]>["request"] =
    vi.fn(async (_name, _lockOptions, callback) => {
      const lock = options.lockAvailable === false ? null : { held: true };
      await callback(lock);
      if (lock !== null) {
        lockCallbackReleasedCount += 1;
        if (options.holdLockRequestCompletion) await heldLockRequest;
      }
      lockRequestCompletedCount += 1;
    });
  const locks: NonNullable<BridgeDependencies["locks"]> = {
    request: lockRequest,
  };

  const createVaultWorker = vi.fn(() => {
    workerCreationOrder.push("vault");
    return vaultWorker;
  });
  const createLoginWorker = vi.fn(() => {
    workerCreationOrder.push("login");
    const worker = new FakeWorker();
    loginWorkers.push(worker);
    return worker;
  });
  const createMessageChannel = vi.fn(() => {
    const channel = {
      port1: fakePort(),
      port2: fakePort(),
    } as MessageChannel;
    messageChannels.push(channel);
    return channel;
  });
  const performanceObserver = {
    observe: vi.fn(),
    takeRecords: vi.fn(() => resourceRecords.splice(0)),
    disconnect: vi.fn(),
  };
  const createPerformanceObserver: BridgeDependencies["createPerformanceObserver"] =
    vi.fn((callback) => {
      resourceCallback = callback;
      return options.performanceObserverAvailable === false
        ? null
        : performanceObserver;
    });

  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  const activityUnsubscribe = vi.fn(() => {
    activityListener = null;
  });
  const subscribeActivity: BridgeDependencies["subscribeActivity"] = vi.fn(
    (listener) => {
      activityListener = listener;
      return activityUnsubscribe;
    }
  );
  let pageNetworkDispatch: (() => void) | null = null;
  const restorePageNetworkFence = vi.fn();
  const installPageNetworkFence: BridgeDependencies["installPageNetworkFence"] =
    vi.fn((onDispatch) => {
      pageNetworkDispatch = onDispatch;
      return restorePageNetworkFence;
    });
  const sha256: BridgeDependencies["sha256"] = vi.fn(async (bytes) => {
    return fakeSha256(bytes);
  });

  const dependencies: BridgeDependencies = {
    origin: () => options.origin ?? PRODUCTION_ORIGIN,
    now: () => nowMs,
    createVaultWorker,
    createLoginWorker,
    createMessageChannel,
    locks: options.locksPresent === false ? null : locks,
    serviceWorker:
      options.serviceWorkerPresent === false ? null : serviceWorker,
    windowTarget,
    documentTarget,
    createPerformanceObserver,
    installPageNetworkFence,
    sha256,
    subscribeActivity,
    setTimer: timerHarness.setTimer,
    clearTimer: timerHarness.clearTimer,
  };
  const bridge = createTask51MemoryRunnerBridge(dependencies);

  return {
    activityUnsubscribe,
    bridge,
    createLoginWorker,
    createMessageChannel,
    createPerformanceObserver,
    createVaultWorker,
    dependencies,
    documentTarget,
    dispatchActivity: () => {
      activityEpoch += 1;
      activityListener?.(activityEpoch);
    },
    fetchSpy,
    finishHeldLockRequest: () => finishHeldLockRequest?.(),
    getLockCallbackReleasedCount: () => lockCallbackReleasedCount,
    getLockRequestCompletedCount: () => lockRequestCompletedCount,
    getResourceCallback: () => resourceCallback,
    getRegistrations,
    lockRequest,
    loginWorkers,
    messageChannels,
    performanceObserver,
    queueResourceRecord: (name: string) => {
      resourceRecords.push({ name } as PerformanceEntry);
    },
    dispatchPageNetwork: () => pageNetworkDispatch?.(),
    installPageNetworkFence,
    restorePageNetworkFence,
    sha256,
    serviceWorker,
    releaseServiceWorkerRegistrationCheck: (callNumber: number) =>
      heldRegistrationChecks.get(callNumber)?.release(),
    setServiceWorkerRegistrationState: (
      state: ServiceWorkerRegistrationState
    ) => {
      serviceWorkerRegistrationState = state;
    },
    setServiceWorkerController: (controller: unknown | null) => {
      serviceWorker.controller = controller;
    },
    setNow: (value: number) => {
      nowMs = value;
    },
    subscribeActivity,
    timerHarness,
    vaultWorker,
    windowTarget,
    workerCreationOrder,
  };
}

type Harness = ReturnType<typeof createHarness>;

async function startSuccessfully(
  harness: Harness,
  stageBExecutionEvidence = rawStageBBinding()
) {
  await harness.bridge.start();
  expect(harness.bridge.snapshot().state).toBe("PREFLIGHT");
  expect(harness.createVaultWorker).not.toHaveBeenCalled();
  expect(harness.loginWorkers).toHaveLength(0);
  harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
  const confirmPromise = harness.bridge.confirmPreflight(
    exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
    stageBExecutionEvidence,
    rawStageBClaimReceipt(stageBExecutionEvidence)
  );
  await waitUntil(() => harness.createVaultWorker.mock.calls.length === 1);
  expect(harness.loginWorkers).toHaveLength(0);
  harness.vaultWorker.emit({ protocol: PROTOCOL, type: "READY" });
  await confirmPromise;
  expect(harness.bridge.snapshot().state).toBe("CAPTURE_USER");
}

async function startToPreflight(harness: Harness) {
  await harness.bridge.start();
  expect(harness.createVaultWorker).not.toHaveBeenCalled();
  expect(harness.loginWorkers).toHaveLength(0);
  expect(harness.bridge.snapshot().state).toBe("PREFLIGHT");
}

function emitCaptureAccepted(
  harness: Harness,
  role: RunnerRole,
  acceptedCount: number,
  loginHttpStatus = 200,
  logoutHttpStatus = 200
) {
  harness.vaultWorker.emit({
    protocol: PROTOCOL,
    type: "CAPTURE_ACCEPTED",
    role,
    acceptedCount,
    loginHttpStatus,
    logoutHttpStatus,
    roleExact: true,
    ttlSufficient: true,
  });
}

async function captureRole(
  harness: Harness,
  role: RunnerRole,
  acceptedCount: number
) {
  const username = testInput(`TEST_ONLY_${role.toUpperCase()}_USER`);
  const password = testInput(`TEST_ONLY_${role.toUpperCase()}_PASS`);
  await harness.bridge.captureFromInputs(role, username, password);
  expect(username.value).toBe("");
  expect(password.value).toBe("");
  emitCaptureAccepted(harness, role, acceptedCount);
  if (role === "root") {
    await waitUntil(() => vaultCommandTypes(harness).includes("RUN_READINESS"));
  }
}

async function captureAllRoles(harness: Harness) {
  harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
  for (let index = 0; index < ROLES.length; index += 1) {
    await captureRole(harness, ROLES[index], index + 1);
  }
}

function safeCellResult(index: number): SafeCellResult {
  const cell = EVIDENCE_LEDGER[index];
  const organizationDenied =
    cell.path === "/v1/organization/list" &&
    (cell.role === "user" || cell.role === "manager");
  return {
    ledgerKey: cell.key,
    phase: cell.phase,
    node: cell.node,
    role: cell.role,
    path: cell.path,
    roleSubjectDigest: ROLE_SUBJECT_DIGESTS[cell.role],
    httpStatus: organizationDenied ? 403 : 200,
    transportPassed: true,
    schemaPassed: true,
    expectedDecisionMatched: true,
    baselineParityMatched: cell.phase === "shadow" ? true : null,
    roleExact: cell.path === "/v1/organization/list" ? null : true,
    crossNodeIdentityMatched:
      cell.path === "/v1/organization/list" ||
      (cell.phase === "readiness" && cell.node === "xrteeth")
        ? null
        : true,
  };
}

function emitCellRange(harness: Harness, start: number, end: number) {
  for (let index = start; index < end; index += 1) {
    harness.vaultWorker.emit({
      protocol: PROTOCOL,
      type: "PROGRESS",
      burnedCells: index + 1,
      totalCells: 56,
    });
    harness.vaultWorker.emit({
      protocol: PROTOCOL,
      type: "CELL_RESULT",
      cell: safeCellResult(index),
    });
  }
}

function emitPhaseCompleted(
  harness: Harness,
  phase: EvidencePhase,
  node: RunnerNode | null,
  phaseCells: number,
  burnedCells: number
) {
  harness.vaultWorker.emit({
    protocol: PROTOCOL,
    type: "PHASE_COMPLETED",
    phase,
    node,
    phaseCells,
    burnedCells,
    ordinaryUserNegativePassed: phase === "readiness" ? null : true,
    rootBreakGlassPassed: phase === "readiness" ? null : true,
  });
}

async function driveToReadiness(harness: Harness) {
  await captureAllRoles(harness);
  emitCellRange(harness, 0, 8);
  emitPhaseCompleted(harness, "readiness", null, 8, 8);
  expect(harness.bridge.snapshot().state).toBe("READINESS_VERIFIED");
}

async function driveToFinalRestoreReady(
  harness: Harness,
  bindProductionMatrix = true
) {
  await driveToReadiness(harness);
  await harness.bridge.runBaseline(
    exactTrueGate(EXTERNAL_GATE_KEYS) as ExternalGate
  );
  emitCellRange(harness, 8, 32);
  emitPhaseCompleted(harness, "baseline", null, 24, 32);
  await harness.bridge.runXrteethShadowReplay(
    exactTrueGate(SHADOW_OPEN_GATE_KEYS) as ShadowOpenGate
  );
  emitCellRange(harness, 32, 44);
  emitPhaseCompleted(harness, "shadow", "xrteeth", 12, 44);
  await harness.bridge.confirmXrteethRestoredAndRunTmrpp(
    exactTrueGate(XRTEETH_RESTORE_GATE_KEYS) as XrteethRestoreGate,
    exactTrueGate(SHADOW_OPEN_GATE_KEYS) as ShadowOpenGate
  );
  emitCellRange(harness, 44, 56);
  emitPhaseCompleted(harness, "shadow", "tmrpp", 12, 56);
  expect(harness.bridge.snapshot()).toMatchObject({
    state: "TMRPP_SHADOW_RUNNING",
    tmrppReplayComplete: true,
  });
  if (bindProductionMatrix) {
    expect(
      await harness.bridge.bindProductionDirectMatrixEvidence(
        rawProductionDirectMatrix()
      )
    ).toBe(true);
  }
}

function vaultCommandTypes(harness: Harness): string[] {
  return harness.vaultWorker.postMessage.mock.calls.map(
    ([message]) => (message as { type: string }).type
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Task 5.1 bridge bootstrap fail-close", () => {
  it.each([
    ["wrong origin", { origin: "https://xrugc.com" }, "ORIGIN_REJECTED"],
    [
      "controlling service worker",
      { serviceWorkerController: {} },
      "SERVICE_WORKER_ACTIVE",
    ],
    [
      "active service worker registration",
      { serviceWorkerRegistrationState: "active" },
      "SERVICE_WORKER_ACTIVE",
    ],
    [
      "waiting service worker registration",
      { serviceWorkerRegistrationState: "waiting" },
      "SERVICE_WORKER_ACTIVE",
    ],
    [
      "installing service worker registration",
      { serviceWorkerRegistrationState: "installing" },
      "SERVICE_WORKER_ACTIVE",
    ],
    [
      "unavailable service worker container",
      { serviceWorkerPresent: false },
      "SERVICE_WORKER_ACTIVE",
    ],
    [
      "unavailable exclusive lock",
      { lockAvailable: false },
      "LOCK_UNAVAILABLE",
    ],
  ] as const)(
    "rejects %s before creating any worker",
    async (_label, options, failureCode) => {
      const harness = createHarness(options);

      await harness.bridge.start();

      expect(harness.bridge.snapshot()).toMatchObject({
        state: "CLEARED",
        cleared: true,
        failureCode,
      });
      expect(harness.createVaultWorker).not.toHaveBeenCalled();
      expect(harness.createLoginWorker).not.toHaveBeenCalled();
      expect(harness.createMessageChannel).not.toHaveBeenCalled();
      expect(harness.fetchSpy).not.toHaveBeenCalled();
    }
  );

  it("installs the controllerchange listener before an in-flight initial check", async () => {
    const harness = createHarness({
      heldServiceWorkerRegistrationChecks: [1],
    });
    const startPromise = harness.bridge.start();
    await waitUntil(() => harness.getRegistrations.mock.calls.length === 1);

    harness.setServiceWorkerController({});
    harness.serviceWorker.dispatchEvent(new Event("controllerchange"));
    harness.releaseServiceWorkerRegistrationCheck(1);
    await startPromise;

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "SERVICE_WORKER_ACTIVE",
    });
    expect(harness.createVaultWorker).not.toHaveBeenCalled();
    expect(harness.lockRequest).not.toHaveBeenCalled();
  });

  it("re-checks registrations after acquiring the exclusive lock", async () => {
    const harness = createHarness({
      serviceWorkerRegistrationSnapshots: ["none", "active"],
    });

    await harness.bridge.start();

    expect(harness.getRegistrations).toHaveBeenCalledTimes(2);
    expect(harness.lockRequest).toHaveBeenCalledOnce();
    expect(harness.createVaultWorker).not.toHaveBeenCalled();
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "SERVICE_WORKER_ACTIVE",
    });
  });
});

describe("Task 5.1 bridge isolated startup", () => {
  it("creates no worker before preflight, then vault first and login workers only after READY", async () => {
    const harness = createHarness();
    await harness.bridge.start();

    expect(harness.subscribeActivity).toHaveBeenCalledOnce();
    expect(harness.workerCreationOrder).toEqual([]);
    expect(harness.createVaultWorker).not.toHaveBeenCalled();
    expect(harness.createLoginWorker).not.toHaveBeenCalled();
    expect(harness.fetchSpy).not.toHaveBeenCalled();
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "PREFLIGHT",
      expectedRole: null,
      quietPeriodRemainingSeconds: 16 * 60,
      operationInFlight: false,
    });

    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    const confirmPromise = harness.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      rawStageBBinding(),
      rawStageBClaimReceipt()
    );
    await waitUntil(() => harness.createVaultWorker.mock.calls.length === 1);

    expect(harness.subscribeActivity.mock.invocationCallOrder[0]).toBeLessThan(
      harness.createVaultWorker.mock.invocationCallOrder[0]
    );
    expect(harness.workerCreationOrder).toEqual(["vault"]);
    expect(harness.loginWorkers).toHaveLength(0);
    expect(harness.fetchSpy).not.toHaveBeenCalled();

    harness.vaultWorker.emit({ protocol: PROTOCOL, type: "READY" });
    await confirmPromise;

    expect(harness.workerCreationOrder).toEqual([
      "vault",
      "login",
      "login",
      "login",
      "login",
    ]);
    expect(harness.loginWorkers).toHaveLength(4);
    expect(
      harness.loginWorkers.every(
        (worker) => worker.postMessage.mock.calls.length === 0
      )
    ).toBe(true);
    expect(harness.createMessageChannel).not.toHaveBeenCalled();
    expect(harness.fetchSpy).not.toHaveBeenCalled();
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CAPTURE_USER",
      expectedRole: "user",
      quietPeriodRemainingSeconds: 0,
      operationInFlight: false,
    });

    await harness.bridge.cleanup();
    expect(harness.activityUnsubscribe).toHaveBeenCalledOnce();
  });

  it("enters terminal cleanup synchronously when operator auth activity is signaled", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);

    harness.dispatchActivity();

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARING",
      failureCode: "UNEXPECTED_TRAFFIC",
    });
    expect(harness.fetchSpy).not.toHaveBeenCalled();
    expect(harness.createMessageChannel).not.toHaveBeenCalled();
    await waitUntil(() => harness.bridge.snapshot().cleared);
    expect(harness.activityUnsubscribe).toHaveBeenCalledOnce();

    harness.dispatchActivity();
    expect(harness.activityUnsubscribe).toHaveBeenCalledOnce();
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "UNEXPECTED_TRAFFIC",
    });
  });

  it("settles preflight confirmation when cleanup happens before vault READY", async () => {
    const harness = createHarness();
    await harness.bridge.start();
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    const confirmPromise = harness.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      rawStageBBinding(),
      rawStageBClaimReceipt()
    );
    await waitUntil(() => harness.createVaultWorker.mock.calls.length === 1);

    await Promise.all([confirmPromise, harness.bridge.cleanup()]);

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      cleared: true,
    });
    expect(harness.createLoginWorker).not.toHaveBeenCalled();
    expect(harness.vaultWorker.terminate).toHaveBeenCalledOnce();
  });
});

describe("Task 5.1 bridge pre-capture proof", () => {
  it("keeps PREFLIGHT non-capturable without reading credential DOM values", async () => {
    const harness = createHarness();
    await startToPreflight(harness);
    let usernameReads = 0;
    let passwordReads = 0;
    let usernameValue = "TEST_ONLY_PREFLIGHT_USER";
    let passwordValue = "TEST_ONLY_PREFLIGHT_PASS";
    const username = {} as HTMLInputElement;
    const password = {} as HTMLInputElement;
    Object.defineProperty(username, "value", {
      configurable: true,
      get: () => {
        usernameReads += 1;
        return usernameValue;
      },
      set: (value: string) => {
        usernameValue = value;
      },
    });
    Object.defineProperty(password, "value", {
      configurable: true,
      get: () => {
        passwordReads += 1;
        return passwordValue;
      },
      set: (value: string) => {
        passwordValue = value;
      },
    });

    await harness.bridge.captureFromInputs("user", username, password);

    expect(usernameReads).toBe(0);
    expect(passwordReads).toBe(0);
    expect(usernameValue).toBe("");
    expect(passwordValue).toBe("");
    expect(harness.createMessageChannel).not.toHaveBeenCalled();
    expect(vaultCommandTypes(harness)).not.toContain("INIT_RUN");
    expect(
      harness.loginWorkers.every(
        (worker) => worker.postMessage.mock.calls.length === 0
      )
    ).toBe(true);
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
  });

  it("arms capture only from an exact all-true preflight gate", async () => {
    const early = createHarness();
    await startToPreflight(early);
    early.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS - 1);
    await early.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      rawStageBBinding(),
      rawStageBClaimReceipt()
    );
    expect(early.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
    expect(early.createVaultWorker).not.toHaveBeenCalled();
    expect(early.createLoginWorker).not.toHaveBeenCalled();
    expect(vaultCommandTypes(early)).not.toContain("INIT_RUN");

    const rejected = createHarness();
    await startToPreflight(rejected);
    rejected.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    await rejected.bridge.confirmPreflight(
      {
        ...exactTrueGate(PREFLIGHT_GATE_KEYS),
        stageBGlobalClaimExact: false,
      } as PreflightGate,
      rawStageBBinding(),
      rawStageBClaimReceipt()
    );
    expect(rejected.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
    expect(rejected.createMessageChannel).not.toHaveBeenCalled();
    expect(rejected.createVaultWorker).not.toHaveBeenCalled();
    expect(rejected.createLoginWorker).not.toHaveBeenCalled();
    expect(vaultCommandTypes(rejected)).not.toContain("INIT_RUN");

    const serviceWorkerBlocked = createHarness();
    await startToPreflight(serviceWorkerBlocked);
    serviceWorkerBlocked.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    serviceWorkerBlocked.setServiceWorkerRegistrationState("active");
    await serviceWorkerBlocked.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      rawStageBBinding(),
      rawStageBClaimReceipt()
    );
    expect(serviceWorkerBlocked.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "SERVICE_WORKER_ACTIVE",
    });
    expect(serviceWorkerBlocked.createVaultWorker).not.toHaveBeenCalled();
    expect(serviceWorkerBlocked.createLoginWorker).not.toHaveBeenCalled();

    const accepted = createHarness();
    await startToPreflight(accepted);
    accepted.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    const acceptedConfirm = accepted.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      rawStageBBinding(),
      rawStageBClaimReceipt()
    );
    await waitUntil(() => accepted.createVaultWorker.mock.calls.length === 1);
    expect(accepted.createLoginWorker).not.toHaveBeenCalled();
    accepted.vaultWorker.emit({ protocol: PROTOCOL, type: "READY" });
    await acceptedConfirm;
    expect(accepted.bridge.snapshot()).toMatchObject({
      state: "CAPTURE_USER",
      expectedRole: "user",
    });
    expect(accepted.createMessageChannel).not.toHaveBeenCalled();
    expect(vaultCommandTypes(accepted)).not.toContain("INIT_RUN");
    await accepted.bridge.cleanup();
  });

  it("rejects oversized raw Stage B evidence before hashing or worker creation", async () => {
    const harness = createHarness();
    await startToPreflight(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);

    await harness.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      new Uint8Array(STAGE_B_EXECUTION_EVIDENCE_MAX_BYTES + 1),
      rawStageBClaimReceipt()
    );

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
    expect(harness.sha256).not.toHaveBeenCalled();
    expect(harness.createVaultWorker).not.toHaveBeenCalled();
    expect(harness.createLoginWorker).not.toHaveBeenCalled();
  });

  it("requires the global claim receipt and zeroizes Stage B before worker creation", async () => {
    const harness = createHarness();
    await startToPreflight(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    const stageB = rawStageBBinding();

    await harness.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      stageB,
      undefined as unknown as Uint8Array
    );

    expect(Array.from(stageB).every((byte) => byte === 0)).toBe(true);
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
    expect(harness.sha256).not.toHaveBeenCalled();
    expect(harness.createVaultWorker).not.toHaveBeenCalled();
    expect(harness.createLoginWorker).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "oversized",
      build: (_stageB: Uint8Array) =>
        new Uint8Array(STAGE_B_GLOBAL_CLAIM_RECEIPT_MAX_BYTES + 1),
    },
    {
      name: "mismatched Stage B hash",
      build: (stageB: Uint8Array) =>
        rawStageBClaimReceipt(stageB, undefined, {
          stageBExecutionEvidenceSha256: "f".repeat(64),
        }),
    },
    {
      name: "non-canonical trailing newline",
      build: (stageB: Uint8Array) => {
        const canonical = rawStageBClaimReceipt(stageB);
        const nonCanonical = new Uint8Array(canonical.byteLength + 1);
        nonCanonical.set(canonical);
        nonCanonical[canonical.byteLength] = 0x0a;
        return nonCanonical;
      },
    },
    {
      name: "claim before issue",
      build: (stageB: Uint8Array) =>
        rawStageBClaimReceipt(stageB, "1969-12-31T23:59:59.999Z"),
    },
  ])(
    "rejects a $name global claim receipt before creating workers",
    async ({ build }) => {
      const harness = createHarness();
      await startToPreflight(harness);
      harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
      const stageB = rawStageBBinding();
      const claimReceipt = build(stageB);

      await harness.bridge.confirmPreflight(
        exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
        stageB,
        claimReceipt
      );

      expect(Array.from(stageB).every((byte) => byte === 0)).toBe(true);
      expect(Array.from(claimReceipt).every((byte) => byte === 0)).toBe(true);
      expect(harness.bridge.snapshot()).toMatchObject({
        state: "CLEARED",
        failureCode: "EXTERNAL_GATE_REJECTED",
      });
      expect(harness.createVaultWorker).not.toHaveBeenCalled();
      expect(harness.createLoginWorker).not.toHaveBeenCalled();
    }
  );
});

describe("Task 5.1 bridge operator quiet period", () => {
  it("rejects 1 ms early and clears boundary credentials only after the service-worker precheck", async () => {
    const early = createHarness();
    await startSuccessfully(early);
    early.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS - 1);
    const earlyUsername = testInput("TEST_ONLY_EARLY_USER");
    const earlyPassword = testInput("TEST_ONLY_EARLY_PASS");

    const earlyCapture = early.bridge.captureFromInputs(
      "user",
      earlyUsername,
      earlyPassword
    );
    expect(earlyUsername.value).toBe("");
    expect(earlyPassword.value).toBe("");
    await earlyCapture;

    expect(early.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
    expect(early.loginWorkers[0].postMessage).not.toHaveBeenCalled();

    const exact = createHarness();
    await startSuccessfully(exact);
    exact.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    const exactUsername = testInput("TEST_ONLY_BOUNDARY_USER");
    const exactPassword = testInput("TEST_ONLY_BOUNDARY_PASS");
    const exactCapture = exact.bridge.captureFromInputs(
      "user",
      exactUsername,
      exactPassword
    );

    expect(exactUsername.value).toBe("TEST_ONLY_BOUNDARY_USER");
    expect(exactPassword.value).toBe("TEST_ONLY_BOUNDARY_PASS");
    expect(exact.createMessageChannel).not.toHaveBeenCalled();
    await exactCapture;
    expect(exactUsername.value).toBe("");
    expect(exactPassword.value).toBe("");
    expect(vaultCommandTypes(exact)).toEqual([
      "INIT_RUN",
      "ATTACH_CAPTURE_PORT",
    ]);
    expect(exact.loginWorkers[0].postMessage).toHaveBeenCalledOnce();
    expect(exact.timerHarness.entries.size).toBeGreaterThanOrEqual(3);

    await exact.bridge.cleanup();
  });

  it("fails closed at startup when the resource fence is unavailable", async () => {
    const harness = createHarness({ performanceObserverAvailable: false });
    await harness.bridge.start();

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "WORKER_ERROR",
    });
    expect(harness.createVaultWorker).not.toHaveBeenCalled();
    expect(harness.createLoginWorker).not.toHaveBeenCalled();
  });

  it.each(["active", "waiting", "installing"] as const)(
    "fails closed when a %s registration appears after startup",
    async (state) => {
      const harness = createHarness();
      await startSuccessfully(harness);
      harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
      harness.setServiceWorkerRegistrationState(state);

      await harness.bridge.captureFromInputs(
        "user",
        testInput("TEST_ONLY_RUNTIME_REGISTRATION_USER"),
        testInput("TEST_ONLY_RUNTIME_REGISTRATION_PASS")
      );

      expect(harness.bridge.snapshot()).toMatchObject({
        state: "CLEARED",
        failureCode: "SERVICE_WORKER_ACTIVE",
      });
      expect(harness.createMessageChannel).not.toHaveBeenCalled();
      expect(harness.loginWorkers[0].postMessage).not.toHaveBeenCalled();
    }
  );

  it("fails closed when controllerchange interleaves with a capture re-check", async () => {
    const harness = createHarness({
      heldServiceWorkerRegistrationChecks: [5],
    });
    await startSuccessfully(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    const capturePromise = harness.bridge.captureFromInputs(
      "user",
      testInput("TEST_ONLY_INTERLEAVED_USER"),
      testInput("TEST_ONLY_INTERLEAVED_PASS")
    );
    await waitUntil(() => harness.getRegistrations.mock.calls.length === 5);

    harness.setServiceWorkerController({});
    harness.serviceWorker.dispatchEvent(new Event("controllerchange"));
    harness.releaseServiceWorkerRegistrationCheck(5);
    await capturePromise;

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "SERVICE_WORKER_ACTIVE",
    });
    expect(vaultCommandTypes(harness)).not.toContain("INIT_RUN");
    expect(harness.createMessageChannel).not.toHaveBeenCalled();
    expect(harness.loginWorkers[0].postMessage).not.toHaveBeenCalled();
  });

  it("does not read credentials until the asynchronous service-worker check completes", async () => {
    const harness = createHarness({
      heldServiceWorkerRegistrationChecks: [5],
    });
    await startSuccessfully(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    let usernameReads = 0;
    let passwordReads = 0;
    let usernameValue = "TEST_ONLY_POST_SW_USER";
    let passwordValue = "TEST_ONLY_POST_SW_PASS";
    const username = {} as HTMLInputElement;
    const password = {} as HTMLInputElement;
    Object.defineProperty(username, "value", {
      configurable: true,
      get: () => {
        usernameReads += 1;
        return usernameValue;
      },
      set: (value: string) => {
        usernameValue = value;
      },
    });
    Object.defineProperty(password, "value", {
      configurable: true,
      get: () => {
        passwordReads += 1;
        return passwordValue;
      },
      set: (value: string) => {
        passwordValue = value;
      },
    });

    const capturePromise = harness.bridge.captureFromInputs(
      "user",
      username,
      password
    );
    await waitUntil(() => harness.getRegistrations.mock.calls.length === 5);

    expect(usernameReads).toBe(0);
    expect(passwordReads).toBe(0);
    expect(usernameValue).toBe("TEST_ONLY_POST_SW_USER");
    expect(passwordValue).toBe("TEST_ONLY_POST_SW_PASS");
    expect(harness.createMessageChannel).not.toHaveBeenCalled();
    expect(vaultCommandTypes(harness)).not.toContain("INIT_RUN");

    harness.releaseServiceWorkerRegistrationCheck(5);
    await capturePromise;

    expect(usernameReads).toBe(1);
    expect(passwordReads).toBe(1);
    expect(usernameValue).toBe("");
    expect(passwordValue).toBe("");
    expect(vaultCommandTypes(harness)).toEqual([
      "INIT_RUN",
      "ATTACH_CAPTURE_PORT",
    ]);
    await harness.bridge.cleanup();
  });

  it("clears pending DOM credentials when navigation interrupts a hung service-worker check", async () => {
    const harness = createHarness({
      heldServiceWorkerRegistrationChecks: [5],
    });
    await startSuccessfully(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    const username = testInput("TEST_ONLY_PENDING_NAV_USER");
    const password = testInput("TEST_ONLY_PENDING_NAV_PASS");
    const capturePromise = harness.bridge.captureFromInputs(
      "user",
      username,
      password
    );
    await waitUntil(() => harness.getRegistrations.mock.calls.length === 5);

    await harness.bridge.abortForNavigation();

    expect(username.value).toBe("");
    expect(password.value).toBe("");
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "LIFECYCLE_ABORT",
    });
    harness.releaseServiceWorkerRegistrationCheck(5);
    await capturePromise;
    expect(harness.loginWorkers[0].postMessage).not.toHaveBeenCalled();
  });
});

describe("Task 5.1 bridge state and evidence order", () => {
  it("runs the exact 56-cell state sequence with xrteeth restore barrier", async () => {
    const harness = createHarness();
    const states: RunnerState[] = [];
    const unsubscribe = harness.bridge.subscribe((snapshot) => {
      states.push(snapshot.state);
    });
    await startSuccessfully(harness);
    await driveToReadiness(harness);

    await harness.bridge.runBaseline(
      exactTrueGate(EXTERNAL_GATE_KEYS) as ExternalGate
    );
    emitCellRange(harness, 8, 32);
    emitPhaseCompleted(harness, "baseline", null, 24, 32);

    await harness.bridge.runXrteethShadowReplay(
      exactTrueGate(SHADOW_OPEN_GATE_KEYS) as ShadowOpenGate
    );
    emitCellRange(harness, 32, 44);
    emitPhaseCompleted(harness, "shadow", "xrteeth", 12, 44);

    await harness.bridge.confirmXrteethRestoredAndRunTmrpp(
      exactTrueGate(XRTEETH_RESTORE_GATE_KEYS) as XrteethRestoreGate,
      exactTrueGate(SHADOW_OPEN_GATE_KEYS) as ShadowOpenGate
    );
    emitCellRange(harness, 44, 56);
    emitPhaseCompleted(harness, "shadow", "tmrpp", 12, 56);

    expect(
      await harness.bridge.bindProductionDirectMatrixEvidence(
        rawProductionDirectMatrix()
      )
    ).toBe(true);

    await harness.bridge.completeAfterFinalRestore(
      exactTrueGate(FINAL_RESTORE_GATE_KEYS) as FinalRestoreGate
    );
    unsubscribe();

    expect(compactStates(states)).toEqual([
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
    ]);
    const commands = vaultCommandTypes(harness);
    expect(commands.indexOf("ACK_XRTEETH_RESTORED")).toBeGreaterThan(-1);
    expect(commands.indexOf("RUN_TMRPP_SHADOW")).toBeGreaterThan(
      commands.indexOf("ACK_XRTEETH_RESTORED")
    );
    expect(harness.loginWorkers).toHaveLength(4);
    expect(
      harness.loginWorkers.every(
        (worker) => worker.terminate.mock.calls.length === 1
      )
    ).toBe(true);
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      burnedCells: 56,
      completed: true,
      cleared: true,
      failureCode: null,
      finalEvidenceState: "READY",
      ordinaryUserNegativePassed: true,
      rootBreakGlassPassed: true,
      tmrppReplayComplete: true,
    });
    expect("cells" in harness.bridge.snapshot()).toBe(false);

    const evidence = harness.bridge.consumeFinalEvidence();
    const rawText = new TextDecoder().decode(evidence.bytes);
    const fragment = JSON.parse(rawText) as Record<string, unknown>;
    expect(fragment.schema).toBe("wp3-task51-runner-fragment-v3");
    expect(fragment.approvalRef).toBe(
      "WP3-TASK51-MEMORY-RUNNER-STAGE-B-19700101"
    );
    expect(fragment.stageBExecutionEvidenceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fragment.stageBGlobalClaimReceiptSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fragment.stageBClaimedAt).toBe("1970-01-01T00:15:00.000Z");
    expect(fragment.productionDirectMatrixEvidenceRef).toBe(
      PRODUCTION_DIRECT_MATRIX_EVIDENCE_REF
    );
    expect(fragment.productionDirectMatrixEvidenceSha256).toMatch(
      /^[a-f0-9]{64}$/
    );
    expect(fragment.productionDirectMatrixSubjectDigest).toBe(
      productionDirectMatrixSubjectDigest()
    );
    expect(fragment.safeCellResults).toHaveLength(56);
    expect(rawText.endsWith("\n")).toBe(true);
    expect(rawText.endsWith("\n\n")).toBe(false);
    expect(evidence.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(harness.bridge.snapshot().finalEvidenceState).toBe("TAKEN");
    expect(() => harness.bridge.consumeFinalEvidence()).toThrow(
      "TASK51_FINAL_EVIDENCE_NOT_READY"
    );
  });

  it("fails closed when phase completion claims cells that were not burned", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await captureAllRoles(harness);

    emitPhaseCompleted(harness, "readiness", null, 8, 0);
    await flushMicrotasks();

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "INVALID_TRANSITION",
    });
  });

  it.each([
    "reports/task51-production-direct-cell.md",
    "reports/../task51-production-direct-cell.json",
  ])(
    "rejects an unsafe Production matrix cell evidence ref %s",
    async (evidenceRef) => {
      const harness = createHarness();
      await startSuccessfully(harness);
      await driveToFinalRestoreReady(harness, false);
      const matrix = JSON.parse(
        new TextDecoder().decode(rawProductionDirectMatrix())
      ) as { cells: Array<Record<string, unknown>> };
      matrix.cells[0].evidenceRef = evidenceRef;

      expect(
        await harness.bridge.bindProductionDirectMatrixEvidence(
          encodeAsciiSortedCanonicalJson(matrix)
        )
      ).toBe(false);
      expect(harness.bridge.snapshot()).toMatchObject({
        state: "CLEARED",
        failureCode: "EXTERNAL_GATE_REJECTED",
      });
    }
  );

  it.each(["userManagement", "iframe"])(
    "rejects a missing ordinary-user negative for %s",
    async (surface) => {
      const harness = createHarness();
      await startSuccessfully(harness);
      await driveToFinalRestoreReady(harness, false);
      const matrix = JSON.parse(
        new TextDecoder().decode(rawProductionDirectMatrix())
      ) as { cells: Array<Record<string, unknown>> };
      const cell = matrix.cells.find(
        (entry) => entry.role === "user" && entry.surface === surface
      );
      expect(cell).toBeDefined();
      cell!.ordinaryUserPrivilegedDenied = false;

      expect(
        await harness.bridge.bindProductionDirectMatrixEvidence(
          encodeAsciiSortedCanonicalJson(matrix)
        )
      ).toBe(false);
      expect(harness.bridge.snapshot()).toMatchObject({
        state: "CLEARED",
        failureCode: "EXTERNAL_GATE_REJECTED",
      });
    }
  );

  it("requires 2xx for both login and logout acceptance", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    const username = testInput("TEST_ONLY_HTTP_USER");
    const password = testInput("TEST_ONLY_HTTP_PASS");
    await harness.bridge.captureFromInputs("user", username, password);

    emitCaptureAccepted(harness, "user", 1, 300, 200);
    await flushMicrotasks();

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "HTTP_STATUS_REJECTED",
    });
  });

  it("rejects extra SafeCellResult keys before accepting the cell", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await captureAllRoles(harness);
    harness.vaultWorker.emit({
      protocol: PROTOCOL,
      type: "PROGRESS",
      burnedCells: 1,
      totalCells: 56,
    });
    harness.vaultWorker.emit({
      protocol: PROTOCOL,
      type: "CELL_RESULT",
      cell: { ...safeCellResult(0), debugFlag: true },
    });
    await waitUntil(() => harness.bridge.snapshot().cleared);

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "WORKER_ERROR",
      finalEvidenceState: "NONE",
    });
  });

  it("never exposes accepted cell payloads through subscriber snapshots", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await captureAllRoles(harness);
    const workerCell = safeCellResult(0);
    harness.vaultWorker.emit({
      protocol: PROTOCOL,
      type: "PROGRESS",
      burnedCells: 1,
      totalCells: 56,
    });
    harness.vaultWorker.emit({
      protocol: PROTOCOL,
      type: "CELL_RESULT",
      cell: workerCell,
    });

    const subscriberSnapshots: ReturnType<typeof harness.bridge.snapshot>[] =
      [];
    const unsubscribe = harness.bridge.subscribe((snapshot) => {
      subscriberSnapshots.push(snapshot);
    });
    const delivered = subscriberSnapshots.at(-1);
    expect(delivered).toBeDefined();
    expect("cells" in (delivered ?? {})).toBe(false);

    expect(Reflect.set(workerCell as object, "httpStatus", 500)).toBe(true);
    expect(Reflect.set(workerCell as object, "transportPassed", false)).toBe(
      true
    );
    expect("cells" in harness.bridge.snapshot()).toBe(false);

    unsubscribe();
    await harness.bridge.cleanup();
  });
});

describe("Task 5.1 bridge external gates", () => {
  it.each(["active", "waiting", "installing"] as const)(
    "re-checks %s registrations before a phase dispatch",
    async (state) => {
      const harness = createHarness();
      await startSuccessfully(harness);
      await driveToReadiness(harness);
      harness.setServiceWorkerRegistrationState(state);

      await harness.bridge.runBaseline(
        exactTrueGate(EXTERNAL_GATE_KEYS) as ExternalGate
      );

      expect(vaultCommandTypes(harness)).not.toContain("RUN_BASELINE");
      expect(harness.bridge.snapshot()).toMatchObject({
        state: "CLEARED",
        failureCode: "SERVICE_WORKER_ACTIVE",
      });
    }
  );

  it("fails closed without dispatch when one exact baseline gate is false", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToReadiness(harness);
    const gate = {
      ...exactTrueGate(EXTERNAL_GATE_KEYS),
      noCompetingWriter: false,
    } as ExternalGate;
    const before = vaultCommandTypes(harness).filter(
      (type) => type === "RUN_BASELINE"
    ).length;

    await harness.bridge.runBaseline(gate);

    expect(
      vaultCommandTypes(harness).filter((type) => type === "RUN_BASELINE")
    ).toHaveLength(before);
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
  });

  it("requires the stored pre-capture proof again at baseline dispatch", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToReadiness(harness);
    (
      harness.bridge as unknown as { preflightProof: PreflightGate | null }
    ).preflightProof = null;

    await harness.bridge.runBaseline(
      exactTrueGate(EXTERNAL_GATE_KEYS) as ExternalGate
    );

    expect(vaultCommandTypes(harness)).not.toContain("RUN_BASELINE");
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
  });

  it("maps a worker dispatch exception to WORKER_ERROR and cleanup", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToReadiness(harness);
    harness.vaultWorker.postMessage.mockImplementation((message: unknown) => {
      if ((message as { type?: string }).type === "RUN_BASELINE") {
        throw new Error("TEST_ONLY_WORKER_DISPATCH_FAILURE");
      }
    });
    let rejection: unknown = null;

    try {
      await harness.bridge.runBaseline(
        exactTrueGate(EXTERNAL_GATE_KEYS) as ExternalGate
      );
    } catch (error) {
      rejection = error;
    }
    await flushMicrotasks();
    const snapshotBeforeFallbackCleanup = harness.bridge.snapshot();
    if (!snapshotBeforeFallbackCleanup.cleared) await harness.bridge.cleanup();

    expect(rejection).toBeNull();
    expect(snapshotBeforeFallbackCleanup).toMatchObject({
      state: "CLEARED",
      failureCode: "WORKER_ERROR",
    });
  });
});

describe("Task 5.1 bridge lifecycle and resource fence", () => {
  it.each([
    [
      "pagehide",
      (harness: Harness) =>
        harness.windowTarget.dispatchEvent(new Event("pagehide")),
      "LIFECYCLE_ABORT",
    ],
    [
      "freeze",
      (harness: Harness) =>
        harness.documentTarget.dispatchEvent(new Event("freeze")),
      "LIFECYCLE_ABORT",
    ],
    [
      "BFCache pageshow",
      (harness: Harness) => {
        const event = new Event("pageshow");
        Object.defineProperty(event, "persisted", { value: true });
        harness.windowTarget.dispatchEvent(event);
      },
      "LIFECYCLE_ABORT",
    ],
    [
      "storage",
      (harness: Harness) =>
        harness.windowTarget.dispatchEvent(new Event("storage")),
      "UNEXPECTED_TRAFFIC",
    ],
    [
      "service worker controllerchange",
      (harness: Harness) =>
        harness.serviceWorker.dispatchEvent(new Event("controllerchange")),
      "SERVICE_WORKER_ACTIVE",
    ],
  ] as const)("cleans up on %s", async (_label, dispatch, failureCode) => {
    const harness = createHarness();
    await startSuccessfully(harness);

    dispatch(harness);
    await waitUntil(() => harness.bridge.snapshot().cleared);

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: failureCode as RunnerFailureCode,
    });
    expect(harness.vaultWorker.terminate).toHaveBeenCalledOnce();
    expect(
      harness.loginWorkers.every(
        (worker) => worker.terminate.mock.calls.length === 1
      )
    ).toBe(true);
    expect(harness.getLockCallbackReleasedCount()).toBe(1);
  });

  it("does not clean up merely because visibility becomes hidden", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    Object.defineProperty(harness.documentTarget, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    harness.documentTarget.dispatchEvent(new Event("visibilitychange"));
    await flushMicrotasks();

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CAPTURE_USER",
      cleared: false,
      failureCode: null,
    });
    expect(harness.vaultWorker.terminate).not.toHaveBeenCalled();
    await harness.bridge.cleanup();
  });

  it("rejects an exact evidence URL observed in the Window timeline", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    const observe = harness.getResourceCallback();
    expect(observe).not.toBeNull();

    observe?.([
      { name: "https://api.xrteeth.com/v1/user/info" } as PerformanceEntry,
    ]);
    await waitUntil(() => harness.bridge.snapshot().cleared);
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "UNEXPECTED_TRAFFIC",
    });
  });

  it.each([
    "https://d.xrugc.com/api/v1/user/info",
    "https://d.xrugc.com/api-auth/v1/auth/refresh",
  ])("rejects same-document operator traffic at %s", async (url) => {
    const harness = createHarness();
    await startSuccessfully(harness);
    const observe = harness.getResourceCallback();
    expect(observe).not.toBeNull();

    observe?.([{ name: url } as PerformanceEntry]);
    await waitUntil(() => harness.bridge.snapshot().cleared);

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "UNEXPECTED_TRAFFIC",
    });
  });

  it("rejects an extra same-URL Window request after all 56 worker-owned cells", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToReadiness(harness);
    await harness.bridge.runBaseline(
      exactTrueGate(EXTERNAL_GATE_KEYS) as ExternalGate
    );
    emitCellRange(harness, 8, 32);
    emitPhaseCompleted(harness, "baseline", null, 24, 32);
    await harness.bridge.runXrteethShadowReplay(
      exactTrueGate(SHADOW_OPEN_GATE_KEYS) as ShadowOpenGate
    );
    emitCellRange(harness, 32, 44);
    emitPhaseCompleted(harness, "shadow", "xrteeth", 12, 44);
    await harness.bridge.confirmXrteethRestoredAndRunTmrpp(
      exactTrueGate(XRTEETH_RESTORE_GATE_KEYS) as XrteethRestoreGate,
      exactTrueGate(SHADOW_OPEN_GATE_KEYS) as ShadowOpenGate
    );
    emitCellRange(harness, 44, 56);
    emitPhaseCompleted(harness, "shadow", "tmrpp", 12, 56);
    expect(harness.bridge.snapshot()).toMatchObject({
      burnedCells: 56,
      cleared: false,
    });

    const observe = harness.getResourceCallback();
    expect(observe).not.toBeNull();
    observe?.([
      { name: "https://api.xrteeth.com/v1/user/info" } as PerformanceEntry,
    ]);
    await waitUntil(() => harness.bridge.snapshot().cleared);

    expect(harness.bridge.snapshot()).toMatchObject({
      burnedCells: 56,
      state: "CLEARED",
      failureCode: "UNEXPECTED_TRAFFIC",
    });
  });

  it("drains buffered observer records before final evidence can become ready", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToFinalRestoreReady(harness);
    harness.queueResourceRecord("https://api.tmrpp.com/v1/plugin/verify-token");

    await harness.bridge.completeAfterFinalRestore(
      exactTrueGate(FINAL_RESTORE_GATE_KEYS) as FinalRestoreGate
    );

    expect(harness.performanceObserver.takeRecords).toHaveBeenCalled();
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      completed: false,
      failureCode: "UNEXPECTED_TRAFFIC",
      finalEvidenceState: "NONE",
    });
    expect(() => harness.bridge.consumeFinalEvidence()).toThrow(
      "TASK51_FINAL_EVIDENCE_NOT_READY"
    );
  });

  it("blocks a synchronous page network dispatch before the final click", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToFinalRestoreReady(harness);

    harness.dispatchPageNetwork();
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARING",
      failureCode: "UNEXPECTED_TRAFFIC",
    });
    await waitUntil(() => harness.bridge.snapshot().cleared);

    expect(harness.bridge.snapshot().finalEvidenceState).toBe("NONE");
    expect(() => harness.bridge.consumeFinalEvidence()).toThrow(
      "TASK51_FINAL_EVIDENCE_NOT_READY"
    );
  });

  it("invalidates completion on a synchronous page dispatch during cleanup", async () => {
    const harness = createHarness({ holdLockRequestCompletion: true });
    await startSuccessfully(harness);
    await driveToFinalRestoreReady(harness);

    const completion = harness.bridge.completeAfterFinalRestore(
      exactTrueGate(FINAL_RESTORE_GATE_KEYS) as FinalRestoreGate
    );
    await waitUntil(() => harness.bridge.snapshot().state === "CLEARING");
    harness.dispatchPageNetwork();
    harness.finishHeldLockRequest();
    await completion;

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      completed: false,
      failureCode: "UNEXPECTED_TRAFFIC",
      finalEvidenceState: "NONE",
    });
    expect(harness.restorePageNetworkFence).toHaveBeenCalledOnce();
  });

  it("invalidates completion when pagehide races cleanup", async () => {
    const harness = createHarness({ holdLockRequestCompletion: true });
    await startSuccessfully(harness);
    await driveToFinalRestoreReady(harness);

    const completion = harness.bridge.completeAfterFinalRestore(
      exactTrueGate(FINAL_RESTORE_GATE_KEYS) as FinalRestoreGate
    );
    await waitUntil(() => harness.bridge.snapshot().state === "CLEARING");
    harness.windowTarget.dispatchEvent(new Event("pagehide"));
    harness.finishHeldLockRequest();
    await completion;

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      completed: false,
      failureCode: "LIFECYCLE_ABORT",
      finalEvidenceState: "NONE",
    });
  });

  it("zeroizes READY evidence when navigation happens before export", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToFinalRestoreReady(harness);
    await harness.bridge.completeAfterFinalRestore(
      exactTrueGate(FINAL_RESTORE_GATE_KEYS) as FinalRestoreGate
    );
    expect(harness.bridge.snapshot().finalEvidenceState).toBe("READY");

    await harness.bridge.abortForNavigation();

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      completed: false,
      failureCode: "LIFECYCLE_ABORT",
      finalEvidenceState: "NONE",
      finalEvidenceSha256: null,
    });
    expect(() => harness.bridge.consumeFinalEvidence()).toThrow(
      "TASK51_FINAL_EVIDENCE_NOT_READY"
    );
  });
});

describe("Task 5.1 bridge page deadline", () => {
  it("rejects a Stage B window that cannot cover the full execution deadline", async () => {
    const harness = createHarness();
    await startToPreflight(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);

    const shortWindowStageB = rawStageBBinding(
      "1969-12-31T23:58:20.000Z",
      "1970-01-01T00:33:20.000Z"
    );
    await harness.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      shortWindowStageB,
      rawStageBClaimReceipt(shortWindowStageB)
    );

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      completed: false,
      failureCode: "EXTERNAL_GATE_REJECTED",
      finalEvidenceState: "NONE",
    });
    expect(harness.createVaultWorker).not.toHaveBeenCalled();
    expect(harness.createLoginWorker).not.toHaveBeenCalled();
  });

  it("rejects capture when Stage B expires while the operator is waiting", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    harness.setNow(2 * 60 * 60 * 1_000);
    const username = testInput("TEST_ONLY_EXPIRED_STAGE_B_USER");
    const password = testInput("TEST_ONLY_EXPIRED_STAGE_B_PASS");

    await harness.bridge.captureFromInputs("user", username, password);

    expect(username.value).toBe("");
    expect(password.value).toBe("");
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      completed: false,
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
    expect(harness.loginWorkers[0].postMessage).not.toHaveBeenCalled();
  });

  it("rejects preflight when async hashing consumes the minimum Stage B remainder", async () => {
    const harness = createHarness();
    await startToPreflight(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    harness.sha256.mockImplementationOnce(async () => {
      harness.setNow(
        2 * 60 * 60 * 1_000 - STAGE_B_MIN_REMAINING_EXECUTION_MS + 1
      );
      return new Uint8Array(32);
    });

    await harness.bridge.confirmPreflight(
      exactTrueGate(PREFLIGHT_GATE_KEYS) as PreflightGate,
      rawStageBBinding(),
      rawStageBClaimReceipt()
    );

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "EXTERNAL_GATE_REJECTED",
    });
    expect(harness.createVaultWorker).not.toHaveBeenCalled();
  });

  it("does not make evidence READY when hashing crosses the page deadline", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToFinalRestoreReady(harness);
    harness.sha256.mockImplementationOnce(async () => {
      harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS + PAGE_DEADLINE_MS);
      return new Uint8Array(32);
    });

    await harness.bridge.completeAfterFinalRestore(
      exactTrueGate(FINAL_RESTORE_GATE_KEYS) as FinalRestoreGate
    );

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      completed: false,
      failureCode: "PAGE_DEADLINE_EXCEEDED",
      finalEvidenceState: "NONE",
    });
  });

  it("invalidates READY evidence when native export waits through the page deadline", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToFinalRestoreReady(harness);
    await harness.bridge.completeAfterFinalRestore(
      exactTrueGate(FINAL_RESTORE_GATE_KEYS) as FinalRestoreGate
    );
    expect(harness.bridge.snapshot().finalEvidenceState).toBe("READY");
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS + PAGE_DEADLINE_MS);

    expect(() => harness.bridge.consumeFinalEvidence()).toThrow(
      "TASK51_FINAL_EVIDENCE_NOT_READY"
    );
    expect(harness.bridge.snapshot()).toMatchObject({
      completed: false,
      failureCode: "PAGE_DEADLINE_EXCEEDED",
      finalEvidenceState: "NONE",
    });
  });

  it("fails once at 30 minutes, clears references, and never retries", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    await harness.bridge.captureFromInputs(
      "user",
      testInput("TEST_ONLY_DEADLINE_USER"),
      testInput("TEST_ONLY_DEADLINE_PASS")
    );
    expect(harness.loginWorkers[0].postMessage).toHaveBeenCalledOnce();

    expect(harness.timerHarness.fire(PAGE_DEADLINE_MS)).toBe(1);
    await waitUntil(() => harness.bridge.snapshot().cleared);

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      failureCode: "PAGE_DEADLINE_EXCEEDED",
    });
    expect(harness.loginWorkers[0].postMessage).toHaveBeenCalledOnce();
    expect(harness.timerHarness.fire(PAGE_DEADLINE_MS)).toBe(0);
  });

  it("rejects a worker message at the hard boundary even when the timer never fired", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    await harness.bridge.captureFromInputs(
      "user",
      testInput("TEST_ONLY_WORKER_BOUNDARY_USER"),
      testInput("TEST_ONLY_WORKER_BOUNDARY_PASS")
    );
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS + PAGE_DEADLINE_MS);

    emitCaptureAccepted(harness, "user", 1);
    await waitUntil(() => harness.bridge.snapshot().cleared);

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      capturedRoles: [],
      completed: false,
      failureCode: "PAGE_DEADLINE_EXCEEDED",
    });
  });

  it("rejects final completion synchronously at the hard boundary without timer delivery", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    await driveToReadiness(harness);
    await harness.bridge.runBaseline(
      exactTrueGate(EXTERNAL_GATE_KEYS) as ExternalGate
    );
    emitCellRange(harness, 8, 32);
    emitPhaseCompleted(harness, "baseline", null, 24, 32);
    await harness.bridge.runXrteethShadowReplay(
      exactTrueGate(SHADOW_OPEN_GATE_KEYS) as ShadowOpenGate
    );
    emitCellRange(harness, 32, 44);
    emitPhaseCompleted(harness, "shadow", "xrteeth", 12, 44);
    await harness.bridge.confirmXrteethRestoredAndRunTmrpp(
      exactTrueGate(XRTEETH_RESTORE_GATE_KEYS) as XrteethRestoreGate,
      exactTrueGate(SHADOW_OPEN_GATE_KEYS) as ShadowOpenGate
    );
    emitCellRange(harness, 44, 56);
    emitPhaseCompleted(harness, "shadow", "tmrpp", 12, 56);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS + PAGE_DEADLINE_MS);

    const completionPromise = harness.bridge.completeAfterFinalRestore(
      exactTrueGate(FINAL_RESTORE_GATE_KEYS) as FinalRestoreGate
    );
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARING",
      completed: false,
      failureCode: "PAGE_DEADLINE_EXCEEDED",
    });
    await completionPromise;

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      completed: false,
      failureCode: "PAGE_DEADLINE_EXCEEDED",
    });
  });
});

describe("Task 5.1 bridge cleanup", () => {
  it("ignores a late safe CAPTURE_ACCEPTED after cleanup has started", async () => {
    const harness = createHarness({ holdLockRequestCompletion: true });
    await startSuccessfully(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    await harness.bridge.captureFromInputs(
      "user",
      testInput("TEST_ONLY_LATE_MESSAGE_USER"),
      testInput("TEST_ONLY_LATE_MESSAGE_PASS")
    );

    const cleanupPromise = harness.bridge.cleanup();
    await waitUntil(() => harness.bridge.snapshot().state === "CLEARING");
    expect(harness.bridge.snapshot().operationInFlight).toBe(false);
    emitCaptureAccepted(harness, "user", 1);
    await flushMicrotasks();

    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARING",
      capturedRoles: [],
      operationInFlight: false,
      failureCode: null,
    });
    harness.finishHeldLockRequest();
    await cleanupPromise;
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      capturedRoles: [],
      failureCode: null,
    });
  });

  it("terminates every active reference exactly once and remains idempotent", async () => {
    const harness = createHarness();
    await startSuccessfully(harness);
    harness.setNow(OPERATOR_AUTH_QUIET_PERIOD_MS);
    await harness.bridge.captureFromInputs(
      "user",
      testInput("TEST_ONLY_CLEANUP_USER"),
      testInput("TEST_ONLY_CLEANUP_PASS")
    );

    await harness.bridge.cleanup();
    await harness.bridge.cleanup();

    expect(
      vaultCommandTypes(harness).filter((type) => type === "CLEAR")
    ).toHaveLength(1);
    expect(harness.vaultWorker.terminate).toHaveBeenCalledOnce();
    expect(
      harness.loginWorkers.map((worker) => worker.terminate.mock.calls.length)
    ).toEqual([1, 1, 1, 1]);
    expect(harness.performanceObserver.disconnect).toHaveBeenCalledOnce();
    expect(harness.getLockCallbackReleasedCount()).toBe(1);
    expect(harness.getLockRequestCompletedCount()).toBe(1);
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      cleared: true,
    });
  });

  it("makes concurrent cleanup callers await the same completion", async () => {
    const harness = createHarness({ holdLockRequestCompletion: true });
    await startSuccessfully(harness);
    const firstCleanup = harness.bridge.cleanup();
    let secondResolved = false;
    const secondCleanup = harness.bridge.cleanup().then(() => {
      secondResolved = true;
    });

    await flushMicrotasks();
    const secondResolvedBeforeLockCompletion = secondResolved;
    harness.finishHeldLockRequest();
    await Promise.all([firstCleanup, secondCleanup]);

    expect(secondResolvedBeforeLockCompletion).toBe(false);
    expect(harness.getLockCallbackReleasedCount()).toBe(1);
    expect(harness.getLockRequestCompletedCount()).toBe(1);
    expect(harness.bridge.snapshot()).toMatchObject({
      state: "CLEARED",
      cleared: true,
    });
  });
});
