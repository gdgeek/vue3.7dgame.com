import {
  EVIDENCE_LEDGER,
  OPERATOR_AUTH_QUIET_PERIOD_MS,
  PAGE_DEADLINE_MS,
  PRODUCTION_DIRECT_MATRIX_MAX_BYTES,
  STAGE_B_MIN_REMAINING_EXECUTION_MS,
  PREFLIGHT_GATE_KEYS,
  PRODUCTION_ORIGIN,
  PROTOCOL,
  REQUEST_TIMEOUT_MS,
  ROLES,
  RUNNER_FRAGMENT_SCHEMA,
  RUNNER_FAILURE_CODES,
  STAGE_B_EXECUTION_EVIDENCE_MAX_BYTES,
  STAGE_B_GLOBAL_CLAIM_RECEIPT_MAX_BYTES,
  advanceRunnerState,
  assertSafeRunnerOutput,
  encodeAsciiSortedCanonicalJson,
  encodeTask51RunnerFragment,
  externalGatesPass,
  finalRestoreGatesPass,
  isSafeRunnerOutput,
  isUint8ArrayBytes,
  parseStageBGlobalClaimReceipt,
  parseStageBExecutionEvidence,
  parseProductionDirectMatrixEvidence,
  preflightGatesPass,
  shadowOpenGatesPass,
  task51SafeCellResultPasses,
  xrteethRestoreGatesPass,
  type ExternalGate,
  type FinalRestoreGate,
  type PreflightGate,
  type RunnerFailureCode,
  type StageBExecutionEvidence,
  type Task51RunnerFragment,
  type RunnerRole,
  type RunnerState,
  type SafeCellResult,
  type ShadowOpenGate,
  type XrteethRestoreGate,
} from "./memoryRunnerProtocol";
import type {
  Task51VaultWorkerCommand,
  Task51VaultWorkerSafeMessage,
} from "@/workers/task51MemoryVault.worker";
import type {
  Task51LoginWorkerCommand,
  Task51LoginWorkerSafeMessage,
} from "@/workers/task51MemoryLogin.worker";
import {
  subscribeSensitiveRuntimeActivity,
  type SensitiveRuntimeActivityListener,
} from "@/services/security/sensitiveRuntimeActivity";

type WorkerLike = {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
};

type LockManagerLike = {
  request(
    name: string,
    options: { mode: "exclusive"; ifAvailable: true },
    callback: (lock: unknown | null) => Promise<void>
  ): Promise<void>;
};

type ServiceWorkerRegistrationLike = {
  active: unknown | null;
  waiting: unknown | null;
  installing: unknown | null;
};
type ServiceWorkerContainerLike = EventTarget & {
  controller: unknown | null;
  getRegistrations(): Promise<ServiceWorkerRegistrationLike[]>;
};

type PerformanceObserverLike = {
  observe(options: { type: "resource"; buffered: boolean }): void;
  takeRecords(): readonly PerformanceEntry[];
  disconnect(): void;
};

type BridgeDependencies = {
  origin: () => string;
  now: () => number;
  createVaultWorker: () => WorkerLike;
  createLoginWorker: () => WorkerLike;
  createMessageChannel: () => MessageChannel;
  locks: LockManagerLike | null;
  serviceWorker: ServiceWorkerContainerLike | null;
  windowTarget: Window;
  documentTarget: Document;
  createPerformanceObserver: (
    callback: (entries: readonly PerformanceEntry[]) => void
  ) => PerformanceObserverLike | null;
  installPageNetworkFence: (onDispatch: () => void) => () => void;
  sha256: (bytes: Uint8Array) => Promise<Uint8Array>;
  subscribeActivity: (listener: SensitiveRuntimeActivityListener) => () => void;
  setTimer: typeof setTimeout;
  clearTimer: typeof clearTimeout;
};

export type FinalEvidenceState = "NONE" | "READY" | "TAKEN";

export type ConsumedTask51FinalEvidence = Readonly<{
  bytes: Uint8Array;
  sha256: string;
}>;

export type Task51RunnerSnapshot = Readonly<{
  state: RunnerState;
  expectedRole: RunnerRole | null;
  capturedRoles: readonly RunnerRole[];
  burnedCells: number;
  totalCells: 56;
  ordinaryUserNegativePassed: boolean | null;
  rootBreakGlassPassed: boolean | null;
  tmrppReplayComplete: boolean;
  completed: boolean;
  cleared: boolean;
  failureCode: RunnerFailureCode | null;
  quietPeriodRemainingSeconds: number;
  operationInFlight: boolean;
  finalEvidenceState: FinalEvidenceState;
  finalEvidenceSha256: string | null;
}>;

const RUNNER_LOCK_NAME = "wp3-task51-memory-runner-exclusive-v1";

const RUNNER_API_ORIGINS = new Set([
  "https://api.xrteeth.com",
  "https://api.tmrpp.com",
]);

const installDefaultPageNetworkFence = (onDispatch: () => void) => {
  const target = window as Window & { fetch?: typeof fetch };
  const originalFetch = target.fetch;
  const xhrPrototype =
    typeof XMLHttpRequest === "undefined" ? null : XMLHttpRequest.prototype;
  const originalSend = xhrPrototype?.send;

  const blockedFetch = function (): Promise<Response> {
    onDispatch();
    return Promise.reject(new Error("TASK51_PAGE_NETWORK_DISPATCH_REJECTED"));
  };
  const blockedSend = function (): never {
    onDispatch();
    throw new Error("TASK51_PAGE_NETWORK_DISPATCH_REJECTED");
  };

  if (typeof originalFetch === "function") target.fetch = blockedFetch;
  if (xhrPrototype && originalSend) xhrPrototype.send = blockedSend;

  return () => {
    if (target.fetch === blockedFetch && originalFetch) {
      target.fetch = originalFetch;
    }
    if (xhrPrototype?.send === blockedSend && originalSend) {
      xhrPrototype.send = originalSend;
    }
  };
};

const defaultSha256 = async (bytes: Uint8Array) =>
  new Uint8Array(
    await globalThis.crypto.subtle.digest("SHA-256", bytes.slice().buffer)
  );

const createDefaultDependencies = (): BridgeDependencies => ({
  origin: () => window.location.origin,
  now: () => Date.now(),
  createVaultWorker: () =>
    new Worker(
      new URL("../../workers/task51MemoryVault.worker.ts", import.meta.url),
      { type: "module", name: "task51-memory-vault" }
    ),
  createLoginWorker: () =>
    new Worker(
      new URL("../../workers/task51MemoryLogin.worker.ts", import.meta.url),
      { type: "module", name: "task51-memory-login" }
    ),
  createMessageChannel: () => new MessageChannel(),
  locks:
    typeof navigator !== "undefined" && "locks" in navigator
      ? (navigator.locks as unknown as LockManagerLike)
      : null,
  serviceWorker:
    typeof navigator !== "undefined" && "serviceWorker" in navigator
      ? (navigator.serviceWorker as unknown as ServiceWorkerContainerLike)
      : null,
  windowTarget: window,
  documentTarget: document,
  createPerformanceObserver: (callback) => {
    if (typeof PerformanceObserver === "undefined") return null;
    const observer = new PerformanceObserver((list) =>
      callback(list.getEntries())
    );
    return observer;
  },
  installPageNetworkFence: installDefaultPageNetworkFence,
  sha256: defaultSha256,
  subscribeActivity: subscribeSensitiveRuntimeActivity,
  setTimer: globalThis.setTimeout.bind(globalThis),
  clearTimer: globalThis.clearTimeout.bind(globalThis),
});

const expectedRoleForState = (state: RunnerState): RunnerRole | null => {
  switch (state) {
    case "CAPTURE_USER":
      return "user";
    case "CAPTURE_MANAGER":
      return "manager";
    case "CAPTURE_ADMIN":
      return "admin";
    case "CAPTURE_ROOT":
      return "root";
    default:
      return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRunnerRole = (value: unknown): value is RunnerRole =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

const isFailureCode = (value: unknown): value is RunnerFailureCode =>
  typeof value === "string" &&
  (RUNNER_FAILURE_CODES as readonly string[]).includes(value);

const SAFE_CELL_RESULT_KEYS = [
  "ledgerKey",
  "phase",
  "node",
  "role",
  "roleSubjectDigest",
  "path",
  "httpStatus",
  "transportPassed",
  "schemaPassed",
  "expectedDecisionMatched",
  "baselineParityMatched",
  "roleExact",
  "crossNodeIdentityMatched",
] as const satisfies readonly (keyof SafeCellResult)[];

const hasExactKeys = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[]
) => {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
};

const isSafeCellResult = (value: unknown): value is SafeCellResult => {
  if (!isRecord(value) || typeof value.ledgerKey !== "string") return false;
  if (!hasExactKeys(value, SAFE_CELL_RESULT_KEYS)) return false;
  const expected = EVIDENCE_LEDGER.find((cell) => cell.key === value.ledgerKey);
  if (!expected) return false;
  return (
    value.phase === expected.phase &&
    value.node === expected.node &&
    value.role === expected.role &&
    typeof value.roleSubjectDigest === "string" &&
    /^[a-f0-9]{64}$/.test(value.roleSubjectDigest) &&
    value.roleSubjectDigest !== "0".repeat(64) &&
    value.path === expected.path &&
    Number.isInteger(value.httpStatus) &&
    typeof value.transportPassed === "boolean" &&
    typeof value.schemaPassed === "boolean" &&
    typeof value.expectedDecisionMatched === "boolean" &&
    (value.baselineParityMatched === null ||
      typeof value.baselineParityMatched === "boolean") &&
    (value.roleExact === null || typeof value.roleExact === "boolean") &&
    (value.crossNodeIdentityMatched === null ||
      typeof value.crossNodeIdentityMatched === "boolean")
  );
};

const rebuildSafeCellResult = (value: unknown): SafeCellResult | null => {
  if (!isSafeCellResult(value)) return null;
  return Object.freeze({
    ledgerKey: value.ledgerKey,
    phase: value.phase,
    node: value.node,
    role: value.role,
    roleSubjectDigest: value.roleSubjectDigest,
    path: value.path,
    httpStatus: value.httpStatus,
    transportPassed: value.transportPassed,
    schemaPassed: value.schemaPassed,
    expectedDecisionMatched: value.expectedDecisionMatched,
    baselineParityMatched: value.baselineParityMatched,
    roleExact: value.roleExact,
    crossNodeIdentityMatched: value.crossNodeIdentityMatched,
  });
};

const stateAcceptsEvidenceCell = (
  state: RunnerState,
  cell: (typeof EVIDENCE_LEDGER)[number]
) => {
  if (state === "CAPTURE_ROOT") return cell.phase === "readiness";
  if (state === "READINESS_VERIFIED") return cell.phase === "baseline";
  if (state === "XRTEETH_SHADOW_RUNNING") {
    return cell.phase === "shadow" && cell.node === "xrteeth";
  }
  if (state === "TMRPP_SHADOW_RUNNING") {
    return cell.phase === "shadow" && cell.node === "tmrpp";
  }
  return false;
};

const isVaultSafeMessage = (
  value: unknown
): value is Task51VaultWorkerSafeMessage => {
  if (!isRecord(value) || value.protocol !== PROTOCOL) return false;
  switch (value.type) {
    case "READY":
      return true;
    case "CAPTURE_ACCEPTED":
      return (
        isRunnerRole(value.role) &&
        Number.isInteger(value.acceptedCount) &&
        Number.isInteger(value.loginHttpStatus) &&
        Number.isInteger(value.logoutHttpStatus) &&
        value.roleExact === true &&
        value.ttlSufficient === true
      );
    case "CELL_RESULT":
      return isSafeCellResult(value.cell);
    case "PROGRESS":
      return Number.isInteger(value.burnedCells) && value.totalCells === 56;
    case "PHASE_COMPLETED":
      return (
        (value.phase === "readiness" ||
          value.phase === "baseline" ||
          value.phase === "shadow") &&
        (value.node === null ||
          value.node === "xrteeth" ||
          value.node === "tmrpp") &&
        Number.isInteger(value.phaseCells) &&
        Number.isInteger(value.burnedCells) &&
        (value.ordinaryUserNegativePassed === null ||
          typeof value.ordinaryUserNegativePassed === "boolean") &&
        (value.rootBreakGlassPassed === null ||
          typeof value.rootBreakGlassPassed === "boolean")
      );
    case "FAILED":
      return isFailureCode(value.code) && Number.isInteger(value.burnedCells);
    case "CLEARED":
      return value.workerReferencesCleared === true;
    default:
      return false;
  }
};

const isLoginSafeMessage = (
  value: unknown
): value is Task51LoginWorkerSafeMessage =>
  isRecord(value) &&
  value.protocol === PROTOCOL &&
  value.type === "FAILED" &&
  isFailureCode(value.code);

const cloneSnapshot = (snapshot: Task51RunnerSnapshot): Task51RunnerSnapshot =>
  Object.freeze({
    ...snapshot,
    capturedRoles: Object.freeze([...snapshot.capturedRoles]),
  });

const freezePreflightProof = (gate: PreflightGate): PreflightGate =>
  Object.freeze(
    Object.fromEntries(PREFLIGHT_GATE_KEYS.map((key) => [key, gate[key]]))
  ) as PreflightGate;

const clearCredentialInputs = (
  usernameInput: HTMLInputElement,
  passwordInput: HTMLInputElement
) => {
  let cleared = true;
  try {
    usernameInput.value = "";
  } catch {
    cleared = false;
  }
  try {
    passwordInput.value = "";
  } catch {
    cleared = false;
  }
  return cleared;
};

const bytesToLowerHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export class Task51MemoryRunnerBridge {
  private readonly dependencies: BridgeDependencies;
  private state: RunnerState = "BOOTSTRAP";
  private preflightProof: PreflightGate | null = null;
  private stageBBinding: Readonly<
    Pick<
      StageBExecutionEvidence,
      | "approvalRef"
      | "executionId"
      | "productionDirectMatrixEvidenceRef"
      | "productionDirectMatrixSubjectDigest"
    > & {
      claimedAt: string;
      claimReceiptSha256: string;
      expiresAt: string;
      sha256: string;
    }
  > | null = null;
  private productionDirectMatrixBinding: Readonly<{
    evidenceRef: string;
    evidenceSha256: string;
    subjectDigest: string;
  }> | null = null;
  private capturedRoles: RunnerRole[] = [];
  private cells: SafeCellResult[] = [];
  private burnedCells = 0;
  private ordinaryUserNegativePassed: boolean | null = null;
  private rootBreakGlassPassed: boolean | null = null;
  private tmrppReplayComplete = false;
  private completed = false;
  private cleared = false;
  private finalRestorePassed = false;
  private failureCode: RunnerFailureCode | null = null;
  private unexpectedTrafficObserved = false;
  private finalEvidenceState: FinalEvidenceState = "NONE";
  private finalEvidenceSha256: string | null = null;
  private finalEvidence: ConsumedTask51FinalEvidence | null = null;
  private startedAtMs: number | null = null;
  private deadlineAtMs: number | null = null;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private stageBExpiryTimer: ReturnType<typeof setTimeout> | null = null;
  private finalEvidenceExpiryTimer: ReturnType<typeof setTimeout> | null = null;
  private finalEvidenceValidUntilMs: number | null = null;
  private quietTimer: ReturnType<typeof setTimeout> | null = null;
  private vaultReadyTimer: ReturnType<typeof setTimeout> | null = null;
  private vaultReadyResolve: (() => void) | null = null;
  private vaultReadyReject: ((error: Error) => void) | null = null;
  private vaultWorker: WorkerLike | null = null;
  private loginWorker: WorkerLike | null = null;
  private loginWorkers = new Map<RunnerRole, WorkerLike>();
  private pendingCredentialInputs: Readonly<{
    username: HTMLInputElement;
    password: HTMLInputElement;
  }> | null = null;
  private phaseInFlight = false;
  private captureInFlight = false;
  private preflightInFlight = false;
  private cleanupStarted = false;
  private cleanupPromise: Promise<void> | null = null;
  private listenersInstalled = false;
  private serviceWorkerChangeObserved = false;
  private releaseLock: (() => void) | null = null;
  private lockTask: Promise<void> | null = null;
  private performanceObserver: PerformanceObserverLike | null = null;
  private restorePageNetworkFence: (() => void) | null = null;
  private unsubscribeActivity: (() => void) | null = null;
  private subscribers = new Set<(snapshot: Task51RunnerSnapshot) => void>();

  constructor(overrides: Partial<BridgeDependencies> = {}) {
    this.dependencies = { ...createDefaultDependencies(), ...overrides };
  }

  snapshot(): Task51RunnerSnapshot {
    const quietPeriodRemainingSeconds =
      this.startedAtMs === null
        ? Math.ceil(OPERATOR_AUTH_QUIET_PERIOD_MS / 1000)
        : Math.max(
            0,
            Math.ceil(
              (this.startedAtMs +
                OPERATOR_AUTH_QUIET_PERIOD_MS -
                this.dependencies.now()) /
                1000
            )
          );
    return cloneSnapshot({
      state: this.state,
      expectedRole: expectedRoleForState(this.state),
      capturedRoles: this.capturedRoles,
      burnedCells: this.burnedCells,
      totalCells: 56,
      ordinaryUserNegativePassed: this.ordinaryUserNegativePassed,
      rootBreakGlassPassed: this.rootBreakGlassPassed,
      tmrppReplayComplete: this.tmrppReplayComplete,
      completed: this.completed,
      cleared: this.cleared,
      failureCode: this.failureCode,
      quietPeriodRemainingSeconds,
      operationInFlight:
        this.preflightInFlight || this.captureInFlight || this.phaseInFlight,
      finalEvidenceState: this.finalEvidenceState,
      finalEvidenceSha256: this.finalEvidenceSha256,
    });
  }

  subscribe(listener: (snapshot: Task51RunnerSnapshot) => void) {
    this.subscribers.add(listener);
    listener(this.snapshot());
    return () => this.subscribers.delete(listener);
  }

  private emit() {
    const snapshot = this.snapshot();
    assertSafeRunnerOutput(snapshot);
    for (const subscriber of this.subscribers) subscriber(snapshot);
  }

  private transition(next: RunnerState) {
    this.state = advanceRunnerState(this.state, next);
    this.emit();
  }

  private deadlineExceeded() {
    return (
      this.deadlineAtMs !== null && this.dependencies.now() >= this.deadlineAtMs
    );
  }

  private stageBWindowExpired() {
    return (
      this.stageBBinding !== null &&
      this.dependencies.now() >= Date.parse(this.stageBBinding.expiresAt)
    );
  }

  private assertStageBRemaining(minimumRemainingMs: number) {
    if (
      this.stageBBinding === null ||
      Date.parse(this.stageBBinding.expiresAt) - this.dependencies.now() <
        minimumRemainingMs
    ) {
      throw new Error("EXTERNAL_GATE_REJECTED");
    }
  }

  private invalidateReadyFinalEvidence(code: RunnerFailureCode) {
    if (this.finalEvidenceState !== "READY" || !this.finalEvidence) return;
    this.finalEvidence.bytes.fill(0);
    this.finalEvidence = null;
    this.finalEvidenceState = "NONE";
    this.finalEvidenceSha256 = null;
    this.finalEvidenceValidUntilMs = null;
    if (this.finalEvidenceExpiryTimer !== null) {
      this.dependencies.clearTimer(this.finalEvidenceExpiryTimer);
      this.finalEvidenceExpiryTimer = null;
    }
    this.completed = false;
    this.failureCode = code;
    this.emit();
  }

  /**
   * Invoking fail() changes the state and starts cleanup synchronously, before
   * its returned promise reaches the lock-release await.
   */
  private failIfDeadlineExceeded() {
    if (this.cleanupStarted) return false;
    const failureCode = this.deadlineExceeded()
      ? "PAGE_DEADLINE_EXCEEDED"
      : this.stageBWindowExpired()
        ? "EXTERNAL_GATE_REJECTED"
        : null;
    if (failureCode === null) return false;
    void this.fail(failureCode);
    return true;
  }

  private assertDeadlineNotExceeded() {
    if (this.deadlineExceeded()) {
      throw new Error("PAGE_DEADLINE_EXCEEDED");
    }
    if (this.stageBWindowExpired()) {
      throw new Error("EXTERNAL_GATE_REJECTED");
    }
  }

  private failureCodeForDispatchError(error: unknown): RunnerFailureCode {
    const message = error instanceof Error ? error.message : "WORKER_ERROR";
    if (message === "PAGE_DEADLINE_EXCEEDED") {
      return "PAGE_DEADLINE_EXCEEDED";
    }
    if (message === "SERVICE_WORKER_ACTIVE") return "SERVICE_WORKER_ACTIVE";
    if (message === "EXTERNAL_GATE_REJECTED") {
      return "EXTERNAL_GATE_REJECTED";
    }
    if (message === "TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED") {
      return "EXTERNAL_GATE_REJECTED";
    }
    if (message === "TASK51_STAGE_B_GLOBAL_CLAIM_RECEIPT_REJECTED") {
      return "EXTERNAL_GATE_REJECTED";
    }
    if (message === "INVALID_TRANSITION") return "INVALID_TRANSITION";
    return "WORKER_ERROR";
  }

  private async acquireExclusiveLock() {
    const locks = this.dependencies.locks;
    if (!locks) throw new Error("LOCK_UNAVAILABLE");

    let acquiredResolve: ((acquired: boolean) => void) | null = null;
    const acquired = new Promise<boolean>((resolve) => {
      acquiredResolve = resolve;
    });
    const released = new Promise<void>((resolve) => {
      this.releaseLock = resolve;
    });

    this.lockTask = locks
      .request(
        RUNNER_LOCK_NAME,
        { mode: "exclusive", ifAvailable: true },
        async (lock) => {
          acquiredResolve?.(lock !== null);
          if (lock !== null) await released;
        }
      )
      .catch(() => {
        acquiredResolve?.(false);
      });

    if (!(await acquired)) throw new Error("LOCK_UNAVAILABLE");
  }

  private assertServiceWorkerSnapshotAbsent(
    registrations: readonly ServiceWorkerRegistrationLike[] = []
  ) {
    const serviceWorker = this.dependencies.serviceWorker;
    if (!serviceWorker) throw new Error("SERVICE_WORKER_ACTIVE");
    if (
      this.serviceWorkerChangeObserved ||
      serviceWorker.controller ||
      registrations.some(
        (registration) =>
          registration.active || registration.waiting || registration.installing
      )
    ) {
      throw new Error("SERVICE_WORKER_ACTIVE");
    }
  }

  /**
   * Re-checks the Service Worker state and executes `operation` in the same
   * continuation as the final controller/registration check. There is no
   * await boundary between that final check and a credential/phase dispatch.
   */
  private async withServiceWorkerAbsent<T>(operation: () => T): Promise<T> {
    const serviceWorker = this.dependencies.serviceWorker;
    this.assertDeadlineNotExceeded();
    this.assertServiceWorkerSnapshotAbsent();
    if (!serviceWorker) throw new Error("SERVICE_WORKER_ACTIVE");

    const registrations = await serviceWorker.getRegistrations();
    this.assertDeadlineNotExceeded();
    this.assertServiceWorkerSnapshotAbsent(registrations);
    if (this.cleanupStarted) throw new Error("WORKER_ERROR");
    return operation();
  }

  private async assertServiceWorkerAbsent() {
    await this.withServiceWorkerAbsent(() => undefined);
  }

  private installLifecycleListeners() {
    if (this.listenersInstalled) return;
    this.listenersInstalled = true;
    this.dependencies.windowTarget.addEventListener("pagehide", this.onAbort);
    this.dependencies.windowTarget.addEventListener(
      "storage",
      this.onUnexpected
    );
    this.dependencies.windowTarget.addEventListener(
      "pageshow",
      this.onPageShow
    );
    this.dependencies.documentTarget.addEventListener("freeze", this.onAbort);
    this.dependencies.serviceWorker?.addEventListener(
      "controllerchange",
      this.onServiceWorkerChange
    );
  }

  private removeLifecycleListeners() {
    if (!this.listenersInstalled) return;
    this.listenersInstalled = false;
    this.dependencies.windowTarget.removeEventListener(
      "pagehide",
      this.onAbort
    );
    this.dependencies.windowTarget.removeEventListener(
      "storage",
      this.onUnexpected
    );
    this.dependencies.windowTarget.removeEventListener(
      "pageshow",
      this.onPageShow
    );
    this.dependencies.documentTarget.removeEventListener(
      "freeze",
      this.onAbort
    );
    this.dependencies.serviceWorker?.removeEventListener(
      "controllerchange",
      this.onServiceWorkerChange
    );
  }

  private readonly onAbort = () => {
    this.recordTerminalInterruption("LIFECYCLE_ABORT");
  };

  private readonly onUnexpected = () => {
    this.recordUnexpectedTraffic();
  };

  private readonly onPageShow = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) {
      this.recordTerminalInterruption("LIFECYCLE_ABORT");
    }
  };

  private readonly onServiceWorkerChange = () => {
    this.serviceWorkerChangeObserved = true;
    this.recordTerminalInterruption("SERVICE_WORKER_ACTIVE");
  };

  private readonly onSensitiveRuntimeActivity: SensitiveRuntimeActivityListener =
    () => {
      this.recordUnexpectedTraffic();
    };

  private recordUnexpectedTraffic() {
    this.unexpectedTrafficObserved = true;
    void this.fail("UNEXPECTED_TRAFFIC");
  }

  private recordTerminalInterruption(code: RunnerFailureCode) {
    if (this.cleanupStarted && this.completed && this.failureCode === null) {
      this.completed = false;
      this.failureCode = code;
    }
    void this.fail(code);
  }

  private inspectResourceEntries(entries: readonly PerformanceEntry[]) {
    for (const entry of entries) {
      let parsed: URL;
      try {
        parsed = new URL(entry.name, this.dependencies.origin());
      } catch {
        this.recordUnexpectedTraffic();
        return;
      }
      const isApiOrigin = RUNNER_API_ORIGINS.has(parsed.origin);
      const isSameOriginApi =
        parsed.origin === PRODUCTION_ORIGIN &&
        (parsed.pathname === "/api" ||
          parsed.pathname.startsWith("/api/") ||
          parsed.pathname === "/api-auth" ||
          parsed.pathname.startsWith("/api-auth/"));
      if (isApiOrigin || isSameOriginApi) {
        this.recordUnexpectedTraffic();
        return;
      }
    }
  }

  private drainResourceFence() {
    this.inspectResourceEntries(this.performanceObserver?.takeRecords() ?? []);
    if (this.unexpectedTrafficObserved) {
      throw new Error("UNEXPECTED_TRAFFIC");
    }
  }

  private startResourceFence() {
    this.performanceObserver = this.dependencies.createPerformanceObserver(
      (entries) => {
        this.inspectResourceEntries(entries);
      }
    );
    if (!this.performanceObserver) throw new Error("WORKER_ERROR");
    this.performanceObserver.observe({ type: "resource", buffered: false });
    this.restorePageNetworkFence = this.dependencies.installPageNetworkFence(
      this.onUnexpected
    );
  }

  async start() {
    if (this.failIfDeadlineExceeded()) {
      await this.cleanupPromise;
      return;
    }
    if (this.state !== "BOOTSTRAP") {
      await this.fail("DUPLICATE_DISPATCH");
      return;
    }
    try {
      if (this.dependencies.origin() !== PRODUCTION_ORIGIN) {
        throw new Error("ORIGIN_REJECTED");
      }
      this.installLifecycleListeners();
      await this.assertServiceWorkerAbsent();
      await this.acquireExclusiveLock();
      await this.assertServiceWorkerAbsent();
      this.unsubscribeActivity = this.dependencies.subscribeActivity(
        this.onSensitiveRuntimeActivity
      );
      this.startResourceFence();
      this.startedAtMs = this.dependencies.now();
      this.quietTimer = this.dependencies.setTimer(() => {
        this.emit();
      }, OPERATOR_AUTH_QUIET_PERIOD_MS);
      this.transition("PREFLIGHT");
    } catch (error) {
      const message = error instanceof Error ? error.message : "WORKER_ERROR";
      const code: RunnerFailureCode =
        message === "SERVICE_WORKER_ACTIVE"
          ? "SERVICE_WORKER_ACTIVE"
          : message === "ORIGIN_REJECTED"
            ? "ORIGIN_REJECTED"
            : message === "LOCK_UNAVAILABLE"
              ? "LOCK_UNAVAILABLE"
              : "WORKER_ERROR";
      await this.fail(code);
    }
  }

  private postVault(
    command: Task51VaultWorkerCommand,
    transfer?: Transferable[]
  ) {
    if (!this.vaultWorker) throw new Error("WORKER_ERROR");
    this.vaultWorker.postMessage(command, transfer);
  }

  async confirmPreflight(
    gates: PreflightGate,
    rawStageBExecutionEvidence: Uint8Array,
    rawStageBGlobalClaimReceipt: Uint8Array
  ) {
    const rawStageBIsBytes = isUint8ArrayBytes(rawStageBExecutionEvidence);
    const rawClaimIsBytes = isUint8ArrayBytes(rawStageBGlobalClaimReceipt);
    const rawStageBIsBounded =
      rawStageBIsBytes &&
      rawStageBExecutionEvidence.byteLength > 0 &&
      rawStageBExecutionEvidence.byteLength <=
        STAGE_B_EXECUTION_EVIDENCE_MAX_BYTES;
    const rawClaimIsBounded =
      rawClaimIsBytes &&
      rawStageBGlobalClaimReceipt.byteLength > 0 &&
      rawStageBGlobalClaimReceipt.byteLength <=
        STAGE_B_GLOBAL_CLAIM_RECEIPT_MAX_BYTES;
    if (this.failIfDeadlineExceeded()) {
      if (rawStageBIsBytes) rawStageBExecutionEvidence.fill(0);
      if (rawClaimIsBytes) rawStageBGlobalClaimReceipt.fill(0);
      await this.cleanupPromise;
      return;
    }
    if (
      this.state !== "PREFLIGHT" ||
      this.captureInFlight ||
      this.phaseInFlight ||
      this.preflightInFlight ||
      this.preflightProof !== null ||
      this.startedAtMs === null ||
      this.dependencies.now() - this.startedAtMs <
        OPERATOR_AUTH_QUIET_PERIOD_MS ||
      !preflightGatesPass(gates) ||
      !rawStageBIsBounded ||
      !rawClaimIsBounded
    ) {
      if (rawStageBIsBytes) rawStageBExecutionEvidence.fill(0);
      if (rawClaimIsBytes) rawStageBGlobalClaimReceipt.fill(0);
      await this.fail("EXTERNAL_GATE_REJECTED");
      return;
    }
    this.preflightInFlight = true;
    this.emit();
    const privateRawCopy = rawStageBExecutionEvidence.slice();
    const privateClaimCopy = rawStageBGlobalClaimReceipt.slice();
    try {
      await this.assertServiceWorkerAbsent();
      const binding = parseStageBExecutionEvidence(
        privateRawCopy,
        this.dependencies.now()
      );
      const bindingSha256 = bytesToLowerHex(
        await this.dependencies.sha256(privateRawCopy)
      );
      if (!/^[a-f0-9]{64}$/.test(bindingSha256)) {
        throw new Error("TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED");
      }
      const claimReceipt = parseStageBGlobalClaimReceipt(
        privateClaimCopy,
        binding,
        bindingSha256,
        this.dependencies.now()
      );
      const claimReceiptSha256 = bytesToLowerHex(
        await this.dependencies.sha256(privateClaimCopy)
      );
      if (!/^[a-f0-9]{64}$/.test(claimReceiptSha256)) {
        throw new Error("TASK51_STAGE_B_GLOBAL_CLAIM_RECEIPT_REJECTED");
      }
      if (
        Date.parse(binding.expiresAt) - this.dependencies.now() <
        STAGE_B_MIN_REMAINING_EXECUTION_MS
      ) {
        throw new Error("TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED");
      }
      await this.assertServiceWorkerAbsent();
      this.preflightProof = freezePreflightProof(gates);
      this.stageBBinding = Object.freeze({
        approvalRef: binding.approvalRef,
        claimedAt: claimReceipt.claimedAt,
        claimReceiptSha256,
        executionId: binding.executionId,
        expiresAt: binding.expiresAt,
        productionDirectMatrixEvidenceRef:
          binding.productionDirectMatrixEvidenceRef,
        productionDirectMatrixSubjectDigest:
          binding.productionDirectMatrixSubjectDigest,
        sha256: bindingSha256,
      });
      const stageBRemainingMs =
        Date.parse(binding.expiresAt) - this.dependencies.now();
      if (stageBRemainingMs < STAGE_B_MIN_REMAINING_EXECUTION_MS) {
        throw new Error("TASK51_STAGE_B_EXECUTION_EVIDENCE_REJECTED");
      }
      this.stageBExpiryTimer = this.dependencies.setTimer(
        () => void this.fail("EXTERNAL_GATE_REJECTED"),
        stageBRemainingMs
      );
      this.vaultWorker = this.dependencies.createVaultWorker();
      this.vaultWorker.onmessage = (event) => this.onVaultMessage(event.data);
      this.vaultWorker.onerror = () => void this.fail("WORKER_ERROR");
      this.vaultWorker.onmessageerror = () => void this.fail("WORKER_ERROR");

      await new Promise<void>((resolve, reject) => {
        this.vaultReadyResolve = resolve;
        this.vaultReadyReject = reject;
        this.vaultReadyTimer = this.dependencies.setTimer(
          () => reject(new Error("WORKER_ERROR")),
          REQUEST_TIMEOUT_MS
        );
      });
      if (this.cleanupStarted) throw new Error("WORKER_ERROR");
      this.assertDeadlineNotExceeded();
      this.assertStageBRemaining(PAGE_DEADLINE_MS);
      for (const role of ROLES) {
        const worker = this.dependencies.createLoginWorker();
        this.loginWorkers.set(role, worker);
        worker.onmessage = (event) => this.onLoginMessage(event.data);
        worker.onerror = () => void this.fail("WORKER_ERROR");
        worker.onmessageerror = () => void this.fail("WORKER_ERROR");
      }
      this.preflightInFlight = false;
      this.transition("CAPTURE_USER");
    } catch (error) {
      this.preflightInFlight = false;
      await this.fail(this.failureCodeForDispatchError(error));
    } finally {
      privateRawCopy.fill(0);
      privateClaimCopy.fill(0);
      rawStageBExecutionEvidence.fill(0);
      rawStageBGlobalClaimReceipt.fill(0);
    }
  }

  async captureFromInputs(
    role: RunnerRole,
    usernameInput: HTMLInputElement,
    passwordInput: HTMLInputElement
  ) {
    if (this.failIfDeadlineExceeded()) {
      clearCredentialInputs(usernameInput, passwordInput);
      await this.cleanupPromise;
      return;
    }
    if (
      this.preflightProof === null ||
      !preflightGatesPass(this.preflightProof)
    ) {
      const cleared = clearCredentialInputs(usernameInput, passwordInput);
      await this.fail(cleared ? "EXTERNAL_GATE_REJECTED" : "WORKER_ERROR");
      return;
    }
    if (
      this.captureInFlight ||
      this.phaseInFlight ||
      expectedRoleForState(this.state) !== role
    ) {
      const cleared = clearCredentialInputs(usernameInput, passwordInput);
      await this.fail(cleared ? "INVALID_TRANSITION" : "WORKER_ERROR");
      return;
    }
    if (
      this.startedAtMs === null ||
      this.dependencies.now() - this.startedAtMs < OPERATOR_AUTH_QUIET_PERIOD_MS
    ) {
      const cleared = clearCredentialInputs(usernameInput, passwordInput);
      await this.fail(cleared ? "EXTERNAL_GATE_REJECTED" : "WORKER_ERROR");
      return;
    }

    this.captureInFlight = true;
    this.pendingCredentialInputs = Object.freeze({
      username: usernameInput,
      password: passwordInput,
    });
    this.emit();
    let dispatchFailure: RunnerFailureCode | null = null;
    try {
      // This is the only await before reading either credential DOM value.
      await this.assertServiceWorkerAbsent();
      this.assertDeadlineNotExceeded();
      this.assertStageBRemaining(PAGE_DEADLINE_MS);
      this.assertServiceWorkerSnapshotAbsent();
      if (
        this.cleanupStarted ||
        this.preflightProof === null ||
        !preflightGatesPass(this.preflightProof)
      ) {
        throw new Error("EXTERNAL_GATE_REJECTED");
      }
      if (expectedRoleForState(this.state) !== role) {
        throw new Error("INVALID_TRANSITION");
      }

      let username = "";
      let password = "";
      try {
        username = usernameInput.value;
        password = passwordInput.value;
        if (!clearCredentialInputs(usernameInput, passwordInput)) {
          throw new Error("WORKER_ERROR");
        }
        if (!username || !password) throw new Error("INVALID_TRANSITION");

        if (this.deadlineAtMs === null) {
          this.deadlineAtMs = this.dependencies.now() + PAGE_DEADLINE_MS;
          this.postVault({
            protocol: PROTOCOL,
            type: "INIT_RUN",
            deadlineAtMs: this.deadlineAtMs,
          });
          this.deadlineTimer = this.dependencies.setTimer(
            () => void this.fail("PAGE_DEADLINE_EXCEEDED"),
            PAGE_DEADLINE_MS
          );
        }

        const channel = this.dependencies.createMessageChannel();
        this.postVault(
          {
            protocol: PROTOCOL,
            type: "ATTACH_CAPTURE_PORT",
            role,
            port: channel.port1,
          },
          [channel.port1]
        );
        this.loginWorker = this.loginWorkers.get(role) ?? null;
        if (!this.loginWorker) throw new Error("WORKER_ERROR");
        const command: Task51LoginWorkerCommand = {
          protocol: PROTOCOL,
          type: "CAPTURE",
          role,
          username,
          password,
          vaultPort: channel.port2,
        };
        this.loginWorker.postMessage(command, [channel.port2]);
      } finally {
        clearCredentialInputs(usernameInput, passwordInput);
        this.pendingCredentialInputs = null;
        username = "";
        password = "";
      }
    } catch (error) {
      this.captureInFlight = false;
      clearCredentialInputs(usernameInput, passwordInput);
      this.pendingCredentialInputs = null;
      dispatchFailure = this.failureCodeForDispatchError(error);
    }
    if (dispatchFailure !== null) await this.fail(dispatchFailure);
  }

  async runBaseline(gates: ExternalGate) {
    if (this.failIfDeadlineExceeded()) {
      await this.cleanupPromise;
      return;
    }
    if (
      this.state !== "READINESS_VERIFIED" ||
      this.phaseInFlight ||
      this.preflightProof === null ||
      !preflightGatesPass(this.preflightProof) ||
      !externalGatesPass(gates)
    ) {
      await this.fail("EXTERNAL_GATE_REJECTED");
      return;
    }
    this.phaseInFlight = true;
    this.emit();
    try {
      await this.withServiceWorkerAbsent(() => {
        this.postVault({ protocol: PROTOCOL, type: "RUN_BASELINE" });
      });
    } catch (error) {
      this.phaseInFlight = false;
      await this.fail(this.failureCodeForDispatchError(error));
    }
  }

  async runXrteethShadowReplay(gates: ShadowOpenGate) {
    if (this.failIfDeadlineExceeded()) {
      await this.cleanupPromise;
      return;
    }
    if (
      this.state !== "BASELINE_READY" ||
      this.phaseInFlight ||
      !shadowOpenGatesPass(gates)
    ) {
      await this.fail("EXTERNAL_GATE_REJECTED");
      return;
    }
    this.phaseInFlight = true;
    this.emit();
    try {
      await this.withServiceWorkerAbsent(() => {
        this.transition("XRTEETH_SHADOW_RUNNING");
        this.postVault({ protocol: PROTOCOL, type: "RUN_XRTEETH_SHADOW" });
      });
    } catch (error) {
      this.phaseInFlight = false;
      await this.fail(this.failureCodeForDispatchError(error));
    }
  }

  async confirmXrteethRestoredAndRunTmrpp(
    restoreGates: XrteethRestoreGate,
    tmrppOpenGates: ShadowOpenGate
  ) {
    if (this.failIfDeadlineExceeded()) {
      await this.cleanupPromise;
      return;
    }
    if (
      this.state !== "WAIT_XRTEETH_RESTORED" ||
      this.phaseInFlight ||
      !xrteethRestoreGatesPass(restoreGates) ||
      !shadowOpenGatesPass(tmrppOpenGates)
    ) {
      await this.fail("EXTERNAL_GATE_REJECTED");
      return;
    }
    this.phaseInFlight = true;
    this.emit();
    try {
      await this.withServiceWorkerAbsent(() => {
        this.postVault({ protocol: PROTOCOL, type: "ACK_XRTEETH_RESTORED" });
        this.transition("TMRPP_SHADOW_RUNNING");
        this.postVault({ protocol: PROTOCOL, type: "RUN_TMRPP_SHADOW" });
      });
    } catch (error) {
      this.phaseInFlight = false;
      await this.fail(this.failureCodeForDispatchError(error));
    }
  }

  async bindProductionDirectMatrixEvidence(raw: Uint8Array) {
    const rawIsBytes = isUint8ArrayBytes(raw);
    if (
      this.failIfDeadlineExceeded() ||
      !rawIsBytes ||
      raw.byteLength === 0 ||
      raw.byteLength > PRODUCTION_DIRECT_MATRIX_MAX_BYTES ||
      this.state !== "TMRPP_SHADOW_RUNNING" ||
      !this.tmrppReplayComplete ||
      this.phaseInFlight ||
      this.productionDirectMatrixBinding !== null ||
      this.stageBBinding === null
    ) {
      if (rawIsBytes) raw.fill(0);
      await this.fail("EXTERNAL_GATE_REJECTED");
      return false;
    }
    this.phaseInFlight = true;
    this.emit();
    const privateRaw = raw.slice();
    raw.fill(0);
    try {
      const matrix = parseProductionDirectMatrixEvidence(privateRaw, {
        approvalRef: this.stageBBinding.approvalRef,
        executionId: this.stageBBinding.executionId,
        stageBExecutionEvidenceSha256: this.stageBBinding.sha256,
        subjectDigest: this.stageBBinding.productionDirectMatrixSubjectDigest,
      });
      const canonicalRoleDigestMap = encodeAsciiSortedCanonicalJson(
        matrix.roleSubjectDigests
      );
      const aggregateDigest = bytesToLowerHex(
        await this.dependencies.sha256(canonicalRoleDigestMap)
      );
      canonicalRoleDigestMap.fill(0);
      if (
        aggregateDigest !== matrix.subjectDigest ||
        Date.parse(matrix.capturedAt) <
          Date.parse(this.stageBBinding.claimedAt) ||
        Date.parse(matrix.capturedAt) > this.dependencies.now() ||
        this.cells.length !== 56 ||
        this.cells.some(
          (cell) =>
            cell.roleSubjectDigest !== matrix.roleSubjectDigests[cell.role]
        )
      ) {
        throw new Error("TASK51_PRODUCTION_DIRECT_MATRIX_REJECTED");
      }
      const evidenceSha256 = bytesToLowerHex(
        await this.dependencies.sha256(privateRaw)
      );
      if (!/^[a-f0-9]{64}$/.test(evidenceSha256)) {
        throw new Error("TASK51_PRODUCTION_DIRECT_MATRIX_REJECTED");
      }
      this.productionDirectMatrixBinding = Object.freeze({
        evidenceRef: this.stageBBinding.productionDirectMatrixEvidenceRef,
        evidenceSha256,
        subjectDigest: matrix.subjectDigest,
      });
    } catch {
      this.phaseInFlight = false;
      privateRaw.fill(0);
      await this.fail("EXTERNAL_GATE_REJECTED");
      return false;
    }
    privateRaw.fill(0);
    this.phaseInFlight = false;
    this.emit();
    return true;
  }

  async completeAfterFinalRestore(gates: FinalRestoreGate) {
    if (this.failIfDeadlineExceeded()) {
      await this.cleanupPromise;
      return;
    }
    if (
      this.state !== "TMRPP_SHADOW_RUNNING" ||
      !this.tmrppReplayComplete ||
      this.burnedCells !== 56 ||
      this.ordinaryUserNegativePassed !== true ||
      this.rootBreakGlassPassed !== true ||
      this.unexpectedTrafficObserved ||
      this.stageBBinding === null ||
      this.productionDirectMatrixBinding === null ||
      this.dependencies.now() >= Date.parse(this.stageBBinding.expiresAt) ||
      !finalRestoreGatesPass(gates)
    ) {
      await this.fail("EXTERNAL_GATE_REJECTED");
      return;
    }
    try {
      this.drainResourceFence();
    } catch {
      await this.fail("UNEXPECTED_TRAFFIC");
      return;
    }
    this.finalRestorePassed = true;
    this.completed = true;
    this.transition("COMPLETE");
    await this.cleanup();
  }

  private onLoginMessage(value: unknown) {
    if (this.cleanupStarted || this.failIfDeadlineExceeded()) return;
    if (!isLoginSafeMessage(value)) {
      void this.fail("WORKER_ERROR");
      return;
    }
    if (!isSafeRunnerOutput(value)) {
      void this.fail("WORKER_ERROR");
      return;
    }
    void this.fail(value.code);
  }

  private onVaultMessage(value: unknown) {
    if (this.cleanupStarted || this.failIfDeadlineExceeded()) return;
    if (!isVaultSafeMessage(value)) {
      this.vaultReadyReject?.(new Error("WORKER_ERROR"));
      void this.fail("WORKER_ERROR");
      return;
    }
    if (!isSafeRunnerOutput(value)) {
      this.vaultReadyReject?.(new Error("WORKER_ERROR"));
      void this.fail("WORKER_ERROR");
      return;
    }
    switch (value.type) {
      case "READY":
        if (
          !this.vaultReadyResolve ||
          this.state !== "PREFLIGHT" ||
          !this.preflightInFlight
        ) {
          void this.fail("DUPLICATE_DISPATCH");
          return;
        }
        if (this.vaultReadyTimer !== null) {
          this.dependencies.clearTimer(this.vaultReadyTimer);
          this.vaultReadyTimer = null;
        }
        this.vaultReadyResolve?.();
        this.vaultReadyResolve = null;
        this.vaultReadyReject = null;
        break;
      case "CAPTURE_ACCEPTED": {
        if (
          !this.captureInFlight ||
          value.role !== expectedRoleForState(this.state) ||
          value.acceptedCount !== this.capturedRoles.length + 1 ||
          value.loginHttpStatus < 200 ||
          value.loginHttpStatus >= 300 ||
          value.logoutHttpStatus < 200 ||
          value.logoutHttpStatus >= 300
        ) {
          void this.fail(
            value.loginHttpStatus < 200 ||
              value.loginHttpStatus >= 300 ||
              value.logoutHttpStatus < 200 ||
              value.logoutHttpStatus >= 300
              ? "HTTP_STATUS_REJECTED"
              : "INVALID_TRANSITION"
          );
          return;
        }
        this.loginWorker?.terminate();
        this.loginWorkers.delete(value.role);
        this.loginWorker = null;
        this.captureInFlight = false;
        this.capturedRoles.push(value.role);
        if (value.role === "root") {
          this.phaseInFlight = true;
          void this.dispatchReadinessAfterServiceWorkerCheck();
        } else {
          const next =
            `CAPTURE_${ROLES[this.capturedRoles.length].toUpperCase()}` as RunnerState;
          this.transition(next);
        }
        this.emit();
        break;
      }
      case "CELL_RESULT": {
        const acceptedCell = rebuildSafeCellResult(value.cell);
        const expected = EVIDENCE_LEDGER[this.cells.length];
        if (
          !acceptedCell ||
          !this.phaseInFlight ||
          !expected ||
          !stateAcceptsEvidenceCell(this.state, expected) ||
          acceptedCell.ledgerKey !== expected.key ||
          this.burnedCells !== this.cells.length + 1 ||
          !task51SafeCellResultPasses(acceptedCell)
        ) {
          void this.fail("INVALID_TRANSITION");
          return;
        }
        this.cells.push(acceptedCell);
        this.emit();
        break;
      }
      case "PROGRESS": {
        const expected = EVIDENCE_LEDGER[this.burnedCells];
        if (
          !this.phaseInFlight ||
          !expected ||
          !stateAcceptsEvidenceCell(this.state, expected) ||
          value.burnedCells !== this.burnedCells + 1 ||
          value.burnedCells > 56
        ) {
          void this.fail("DUPLICATE_DISPATCH");
          return;
        }
        this.burnedCells = value.burnedCells;
        this.emit();
        break;
      }
      case "PHASE_COMPLETED":
        this.onPhaseCompleted(value);
        break;
      case "FAILED":
        if (value.burnedCells < this.burnedCells || value.burnedCells > 56) {
          void this.fail("WORKER_ERROR");
          return;
        }
        this.burnedCells = value.burnedCells;
        void this.fail(value.code);
        break;
      case "CLEARED":
        if (!this.cleanupStarted) void this.fail("INVALID_TRANSITION");
        break;
    }
  }

  private async dispatchReadinessAfterServiceWorkerCheck() {
    try {
      await this.withServiceWorkerAbsent(() => {
        this.postVault({ protocol: PROTOCOL, type: "RUN_READINESS" });
      });
    } catch (error) {
      this.phaseInFlight = false;
      await this.fail(this.failureCodeForDispatchError(error));
    }
  }

  private onPhaseCompleted(
    value: Extract<Task51VaultWorkerSafeMessage, { type: "PHASE_COMPLETED" }>
  ) {
    const expectedCumulative =
      value.phase === "readiness"
        ? 8
        : value.phase === "baseline"
          ? 32
          : value.node === "xrteeth"
            ? 44
            : value.node === "tmrpp"
              ? 56
              : -1;
    if (
      !this.phaseInFlight ||
      expectedCumulative < 0 ||
      value.burnedCells !== expectedCumulative ||
      this.burnedCells !== expectedCumulative ||
      this.cells.length !== expectedCumulative
    ) {
      void this.fail("INVALID_TRANSITION");
      return;
    }
    if (
      value.phase === "readiness"
        ? value.ordinaryUserNegativePassed !== null ||
          value.rootBreakGlassPassed !== null
        : value.ordinaryUserNegativePassed !== true ||
          value.rootBreakGlassPassed !== true
    ) {
      void this.fail("HTTP_STATUS_REJECTED");
      return;
    }
    this.phaseInFlight = false;
    if (value.ordinaryUserNegativePassed !== null) {
      this.ordinaryUserNegativePassed =
        this.ordinaryUserNegativePassed === false
          ? false
          : value.ordinaryUserNegativePassed;
    }
    if (value.rootBreakGlassPassed !== null) {
      this.rootBreakGlassPassed =
        this.rootBreakGlassPassed === false
          ? false
          : value.rootBreakGlassPassed;
    }

    if (
      value.phase === "readiness" &&
      value.node === null &&
      value.phaseCells === 8 &&
      this.state === "CAPTURE_ROOT"
    ) {
      this.transition("READINESS_VERIFIED");
      return;
    }
    if (
      value.phase === "baseline" &&
      value.node === null &&
      value.phaseCells === 24 &&
      this.state === "READINESS_VERIFIED"
    ) {
      this.transition("BASELINE_READY");
      return;
    }
    if (
      value.phase === "shadow" &&
      value.node === "xrteeth" &&
      value.phaseCells === 12 &&
      this.state === "XRTEETH_SHADOW_RUNNING"
    ) {
      this.transition("WAIT_XRTEETH_RESTORED");
      return;
    }
    if (
      value.phase === "shadow" &&
      value.node === "tmrpp" &&
      value.phaseCells === 12 &&
      this.state === "TMRPP_SHADOW_RUNNING"
    ) {
      this.tmrppReplayComplete = true;
      this.emit();
      return;
    }
    void this.fail("INVALID_TRANSITION");
  }

  async abortForNavigation() {
    if (this.finalEvidenceState === "READY") {
      this.invalidateReadyFinalEvidence("LIFECYCLE_ABORT");
      return;
    }
    if (this.failIfDeadlineExceeded()) {
      await this.cleanupPromise;
      return;
    }
    await this.fail("LIFECYCLE_ABORT");
  }

  private async fail(code: RunnerFailureCode) {
    if (this.cleanupStarted) {
      await this.cleanupPromise;
      return;
    }
    this.failureCode = code;
    if (this.state !== "FAILED_TERMINAL" && this.state !== "CLEARED") {
      try {
        this.transition("FAILED_TERMINAL");
      } catch {
        this.state = "FAILED_TERMINAL";
        this.emit();
      }
    }
    await this.cleanup();
  }

  async cleanup() {
    if (this.cleanupPromise) return this.cleanupPromise;
    this.cleanupStarted = true;
    this.cleanupPromise = this.performCleanup();
    return this.cleanupPromise;
  }

  private finalEvidencePreconditionsPass() {
    return (
      this.state === "CLEARED" &&
      this.completed === true &&
      this.cleared === true &&
      this.finalRestorePassed === true &&
      this.failureCode === null &&
      this.unexpectedTrafficObserved === false &&
      this.serviceWorkerChangeObserved === false &&
      !this.deadlineExceeded() &&
      this.burnedCells === 56 &&
      this.cells.length === 56 &&
      this.cells.every((cell) => task51SafeCellResultPasses(cell)) &&
      this.capturedRoles.length === 4 &&
      this.capturedRoles.every((role, index) => role === ROLES[index]) &&
      this.ordinaryUserNegativePassed === true &&
      this.rootBreakGlassPassed === true &&
      this.tmrppReplayComplete === true &&
      this.preflightProof !== null &&
      preflightGatesPass(this.preflightProof) &&
      this.stageBBinding !== null &&
      this.productionDirectMatrixBinding !== null &&
      this.dependencies.now() < Date.parse(this.stageBBinding.expiresAt) &&
      this.vaultWorker === null &&
      this.loginWorker === null &&
      this.loginWorkers.size === 0 &&
      this.releaseLock === null &&
      this.lockTask === null
    );
  }

  private async buildFinalEvidence(): Promise<ConsumedTask51FinalEvidence> {
    if (!this.finalEvidencePreconditionsPass() || !this.stageBBinding) {
      throw new Error("TASK51_FINAL_EVIDENCE_NOT_READY");
    }
    const fragment: Task51RunnerFragment = Object.freeze({
      approvalRef: this.stageBBinding.approvalRef,
      counts: Object.freeze({
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
      }),
      executionId: this.stageBBinding.executionId,
      exportedAt: new Date(this.dependencies.now()).toISOString(),
      flags: Object.freeze({
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
      }),
      protocol: PROTOCOL,
      productionDirectMatrixEvidenceRef:
        this.productionDirectMatrixBinding!.evidenceRef,
      productionDirectMatrixEvidenceSha256:
        this.productionDirectMatrixBinding!.evidenceSha256,
      productionDirectMatrixSubjectDigest:
        this.productionDirectMatrixBinding!.subjectDigest,
      safeCellResults: Object.freeze(
        this.cells.map((cell) => Object.freeze({ ...cell }))
      ),
      schema: RUNNER_FRAGMENT_SCHEMA,
      stageBClaimedAt: this.stageBBinding.claimedAt,
      stageBExecutionEvidenceSha256: this.stageBBinding.sha256,
      stageBGlobalClaimReceiptSha256: this.stageBBinding.claimReceiptSha256,
    });
    const bytes = encodeTask51RunnerFragment(fragment);
    const sha256 = bytesToLowerHex(await this.dependencies.sha256(bytes));
    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      bytes.fill(0);
      throw new Error("TASK51_RUNNER_FRAGMENT_REJECTED");
    }
    return Object.freeze({ bytes, sha256 });
  }

  consumeFinalEvidence(): ConsumedTask51FinalEvidence {
    if (
      this.finalEvidenceState === "READY" &&
      this.finalEvidenceValidUntilMs !== null &&
      this.dependencies.now() >= this.finalEvidenceValidUntilMs
    ) {
      this.invalidateReadyFinalEvidence(
        this.deadlineExceeded()
          ? "PAGE_DEADLINE_EXCEEDED"
          : "EXTERNAL_GATE_REJECTED"
      );
    }
    if (
      this.state !== "CLEARED" ||
      !this.cleared ||
      !this.completed ||
      this.failureCode !== null ||
      this.finalEvidenceState !== "READY" ||
      !this.finalEvidence
    ) {
      throw new Error("TASK51_FINAL_EVIDENCE_NOT_READY");
    }
    const taken = this.finalEvidence;
    this.finalEvidence = null;
    this.finalEvidenceState = "TAKEN";
    this.finalEvidenceValidUntilMs = null;
    if (this.finalEvidenceExpiryTimer !== null) {
      this.dependencies.clearTimer(this.finalEvidenceExpiryTimer);
      this.finalEvidenceExpiryTimer = null;
    }
    const bytes = taken.bytes.slice();
    taken.bytes.fill(0);
    this.emit();
    return Object.freeze({
      bytes,
      sha256: taken.sha256,
    });
  }

  private async performCleanup() {
    this.preflightInFlight = false;
    this.captureInFlight = false;
    this.phaseInFlight = false;
    const pendingCredentialInputs = this.pendingCredentialInputs;
    this.pendingCredentialInputs = null;
    if (pendingCredentialInputs) {
      const cleared = clearCredentialInputs(
        pendingCredentialInputs.username,
        pendingCredentialInputs.password
      );
      if (!cleared) {
        this.completed = false;
        this.failureCode ??= "WORKER_ERROR";
      }
    }
    const readyReject = this.vaultReadyReject;
    this.vaultReadyResolve = null;
    this.vaultReadyReject = null;
    readyReject?.(new Error("WORKER_ERROR"));
    if (this.deadlineTimer !== null) {
      this.dependencies.clearTimer(this.deadlineTimer);
      this.deadlineTimer = null;
    }
    if (this.stageBExpiryTimer !== null) {
      this.dependencies.clearTimer(this.stageBExpiryTimer);
      this.stageBExpiryTimer = null;
    }
    if (this.quietTimer !== null) {
      this.dependencies.clearTimer(this.quietTimer);
      this.quietTimer = null;
    }
    if (this.vaultReadyTimer !== null) {
      this.dependencies.clearTimer(this.vaultReadyTimer);
      this.vaultReadyTimer = null;
    }
    if (this.state !== "CLEARING" && this.state !== "CLEARED") {
      try {
        this.transition("CLEARING");
      } catch {
        this.state = "CLEARING";
        this.emit();
      }
    }
    try {
      this.postVault({ protocol: PROTOCOL, type: "CLEAR" });
    } catch {
      // Termination below is the authoritative local memory cleanup.
    }
    const loginWorkers = new Set(this.loginWorkers.values());
    if (this.loginWorker) loginWorkers.add(this.loginWorker);
    for (const worker of loginWorkers) worker.terminate();
    this.loginWorkers.clear();
    this.vaultWorker?.terminate();
    this.loginWorker = null;
    this.vaultWorker = null;
    this.releaseLock?.();
    this.releaseLock = null;
    await this.lockTask?.catch(() => undefined);
    this.lockTask = null;
    this.state = "CLEARED";
    this.cleared = true;
    let preparedEvidence: ConsumedTask51FinalEvidence | null = null;
    try {
      this.drainResourceFence();
      if (this.finalEvidencePreconditionsPass()) {
        preparedEvidence = await this.buildFinalEvidence();
        this.drainResourceFence();
      }
    } catch {
      if (this.completed) {
        this.completed = false;
        this.failureCode = this.unexpectedTrafficObserved
          ? "UNEXPECTED_TRAFFIC"
          : "WORKER_ERROR";
      }
      preparedEvidence?.bytes.fill(0);
      preparedEvidence = null;
    } finally {
      this.performanceObserver?.disconnect();
      this.performanceObserver = null;
      this.restorePageNetworkFence?.();
      this.restorePageNetworkFence = null;
      this.unsubscribeActivity?.();
      this.unsubscribeActivity = null;
      this.removeLifecycleListeners();
    }
    if (preparedEvidence && this.finalEvidencePreconditionsPass()) {
      const stageBExpiresAtMs = Date.parse(this.stageBBinding!.expiresAt);
      const validUntilMs = Math.min(
        this.deadlineAtMs ?? stageBExpiresAtMs,
        stageBExpiresAtMs
      );
      const remainingMs = validUntilMs - this.dependencies.now();
      if (remainingMs > 0) {
        this.finalEvidence = preparedEvidence;
        this.finalEvidenceSha256 = preparedEvidence.sha256;
        this.finalEvidenceState = "READY";
        this.finalEvidenceValidUntilMs = validUntilMs;
        this.finalEvidenceExpiryTimer = this.dependencies.setTimer(() => {
          this.invalidateReadyFinalEvidence(
            this.deadlineExceeded()
              ? "PAGE_DEADLINE_EXCEEDED"
              : "EXTERNAL_GATE_REJECTED"
          );
        }, remainingMs);
      } else {
        preparedEvidence.bytes.fill(0);
        this.completed = false;
        this.failureCode = this.deadlineExceeded()
          ? "PAGE_DEADLINE_EXCEEDED"
          : "EXTERNAL_GATE_REJECTED";
      }
    } else if (preparedEvidence) {
      preparedEvidence.bytes.fill(0);
      if (this.completed) {
        this.completed = false;
        this.failureCode = this.deadlineExceeded()
          ? "PAGE_DEADLINE_EXCEEDED"
          : "EXTERNAL_GATE_REJECTED";
      }
    }
    this.preflightProof = null;
    this.stageBBinding = null;
    this.productionDirectMatrixBinding = null;
    this.cells = [];
    this.capturedRoles = [];
    this.emit();
  }
}

export const createTask51MemoryRunnerBridge = (
  dependencies: Partial<BridgeDependencies> = {}
) => new Task51MemoryRunnerBridge(dependencies);

export type { BridgeDependencies, WorkerLike };
