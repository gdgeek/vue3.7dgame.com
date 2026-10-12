import {
  API_ORIGIN_BY_NODE,
  CLOCK_SKEW_MS,
  EVIDENCE_LEDGER,
  EVIDENCE_RESPONSE_MAX_BYTES,
  MIN_TOKEN_TTL_MS,
  PROTOCOL,
  REQUEST_TIMEOUT_MS,
  ROLES,
  RUNNER_FAILURE_CODES,
  assertSafeRunnerOutput,
  burnLedgerCell,
  createEvidenceLedgerRuntime,
  type EvidenceLedgerCell,
  type RunnerFailureCode,
  type RunnerNode,
  type RunnerRole,
  type SafeCellResult,
} from "@/services/task51/memoryRunnerProtocol";

export type Task51VaultWorkerCommand =
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "INIT_RUN";
      deadlineAtMs: number;
    }>
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "ATTACH_CAPTURE_PORT";
      role: RunnerRole;
      port: MessagePort;
    }>
  | Readonly<{ protocol: typeof PROTOCOL; type: "RUN_READINESS" }>
  | Readonly<{ protocol: typeof PROTOCOL; type: "RUN_BASELINE" }>
  | Readonly<{ protocol: typeof PROTOCOL; type: "RUN_XRTEETH_SHADOW" }>
  | Readonly<{ protocol: typeof PROTOCOL; type: "ACK_XRTEETH_RESTORED" }>
  | Readonly<{ protocol: typeof PROTOCOL; type: "RUN_TMRPP_SHADOW" }>
  | Readonly<{ protocol: typeof PROTOCOL; type: "CLEAR" }>;

export type Task51CapturePortMessage =
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "CAPTURE_OK";
      role: RunnerRole;
      accessBytes: ArrayBuffer;
      expiresAtMs: number;
      loginHttpStatus: number;
      logoutHttpStatus: number;
    }>
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "CAPTURE_FAILED";
      role: RunnerRole;
      code: RunnerFailureCode;
    }>;

export type Task51VaultWorkerSafeMessage =
  | Readonly<{ protocol: typeof PROTOCOL; type: "READY" }>
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "CAPTURE_ACCEPTED";
      role: RunnerRole;
      acceptedCount: number;
      loginHttpStatus: number;
      logoutHttpStatus: number;
      roleExact: true;
      ttlSufficient: true;
    }>
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "CELL_RESULT";
      cell: SafeCellResult;
    }>
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "PROGRESS";
      burnedCells: number;
      totalCells: 56;
    }>
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "PHASE_COMPLETED";
      phase: "readiness" | "baseline" | "shadow";
      node: RunnerNode | null;
      phaseCells: number;
      burnedCells: number;
      ordinaryUserNegativePassed: boolean | null;
      rootBreakGlassPassed: boolean | null;
    }>
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "FAILED";
      code: RunnerFailureCode;
      burnedCells: number;
    }>
  | Readonly<{
      protocol: typeof PROTOCOL;
      type: "CLEARED";
      workerReferencesCleared: true;
    }>;

type MinimalWorkerScope = {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
  close(): void;
};

export type Task51VaultWorkerDependencies = {
  fetch: typeof fetch;
  crypto: Crypto;
  now: () => number;
  serviceWorkerController: () => unknown | null;
  setTimer: typeof setTimeout;
  clearTimer: typeof clearTimeout;
};

type TokenSlot = {
  bytes: Uint8Array;
  expiresAtMs: number;
  fingerprint: string;
};

type IdentityBinding = {
  subjectFingerprint: string;
  roleSet: string;
};

type BaselineRecord = {
  httpStatus: number;
  rawFingerprint: string;
  projection: string;
};

type InspectedResponse = {
  projection: string;
  decisionMatched: boolean;
  roleExact: boolean | null;
  identity: IdentityBinding | null;
};

type VaultStage =
  | "CAPTURING"
  | "READY_FOR_READINESS"
  | "READY_FOR_BASELINE"
  | "READY_FOR_XRTEETH_SHADOW"
  | "WAIT_XRTEETH_RESTORED"
  | "READY_FOR_TMRPP_SHADOW"
  | "TMRPP_SHADOW_COMPLETE"
  | "TERMINAL";

class VaultFailure extends Error {
  constructor(readonly code: RunnerFailureCode) {
    super(code);
    this.name = "VaultFailure";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[]
) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
};

const isRunnerRole = (value: unknown): value is RunnerRole =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

const isRunnerFailureCode = (value: unknown): value is RunnerFailureCode =>
  typeof value === "string" &&
  (RUNNER_FAILURE_CODES as readonly string[]).includes(value);

const isMessagePort = (value: unknown): value is MessagePort =>
  isRecord(value) &&
  typeof value.postMessage === "function" &&
  typeof value.close === "function";

export function isTask51VaultWorkerCommand(
  value: unknown
): value is Task51VaultWorkerCommand {
  if (!isRecord(value) || value.protocol !== PROTOCOL) return false;

  switch (value.type) {
    case "INIT_RUN":
      return (
        hasExactKeys(value, ["protocol", "type", "deadlineAtMs"]) &&
        typeof value.deadlineAtMs === "number" &&
        Number.isFinite(value.deadlineAtMs)
      );
    case "ATTACH_CAPTURE_PORT":
      return (
        hasExactKeys(value, ["protocol", "type", "role", "port"]) &&
        isRunnerRole(value.role) &&
        isMessagePort(value.port)
      );
    case "RUN_READINESS":
    case "RUN_BASELINE":
    case "RUN_XRTEETH_SHADOW":
    case "ACK_XRTEETH_RESTORED":
    case "RUN_TMRPP_SHADOW":
    case "CLEAR":
      return hasExactKeys(value, ["protocol", "type"]);
    default:
      return false;
  }
}

function isCapturePortMessage(
  value: unknown
): value is Task51CapturePortMessage {
  if (
    !isRecord(value) ||
    value.protocol !== PROTOCOL ||
    !isRunnerRole(value.role)
  ) {
    return false;
  }
  if (value.type === "CAPTURE_OK") {
    return (
      hasExactKeys(value, [
        "protocol",
        "type",
        "role",
        "accessBytes",
        "expiresAtMs",
        "loginHttpStatus",
        "logoutHttpStatus",
      ]) &&
      value.accessBytes instanceof ArrayBuffer &&
      typeof value.expiresAtMs === "number" &&
      Number.isFinite(value.expiresAtMs) &&
      Number.isInteger(value.loginHttpStatus) &&
      Number.isInteger(value.logoutHttpStatus)
    );
  }
  return (
    value.type === "CAPTURE_FAILED" &&
    hasExactKeys(value, ["protocol", "type", "role", "code"]) &&
    isRunnerFailureCode(value.code)
  );
}

function primaryRole(roles: readonly string[]): RunnerRole | null {
  for (const role of [...ROLES].reverse()) {
    if (roles.includes(role)) return role;
  }
  return null;
}

function normalizeRoles(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((role) => typeof role !== "string" || role.length === 0)
  ) {
    throw new VaultFailure("RESPONSE_SCHEMA_REJECTED");
  }
  return [...new Set(value)].sort();
}

function numericSubject(value: unknown): string {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).length === 0
  ) {
    throw new VaultFailure("RESPONSE_SCHEMA_REJECTED");
  }
  return String(value);
}

function canonicalProjection(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

async function readBodyLimited(
  response: Response,
  maximumBytes: number
): Promise<Uint8Array> {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maximumBytes) {
      bytes.fill(0);
      throw new VaultFailure("RESPONSE_TOO_LARGE");
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      byteLength += value.byteLength;
      if (byteLength > maximumBytes) {
        for (const chunk of chunks) chunk.fill(0);
        value.fill(0);
        throw new VaultFailure("RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
    chunk.fill(0);
  }
  return result;
}

async function sha256Hex(cryptoValue: Crypto, bytes: Uint8Array) {
  const copy = bytes.slice();
  try {
    const digest = await cryptoValue.subtle.digest("SHA-256", copy.buffer);
    return [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  } finally {
    copy.fill(0);
  }
}

function currentWorkerServiceWorkerController(): unknown | null {
  if (typeof globalThis.navigator === "undefined") return null;
  const workerNavigator = globalThis.navigator as {
    readonly serviceWorker?: { readonly controller?: unknown | null };
  };
  return workerNavigator.serviceWorker?.controller ?? null;
}

async function withRequestDeadline<T>(
  dependencies: Task51VaultWorkerDependencies,
  setController: (controller: AbortController | null) => void,
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  setController(controller);
  const timer = dependencies.setTimer(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const result = await operation(controller.signal);
    if (timedOut) throw new VaultFailure("REQUEST_TIMEOUT");
    return result;
  } catch (error) {
    if (timedOut) throw new VaultFailure("REQUEST_TIMEOUT");
    if (error instanceof VaultFailure) throw error;
    throw new VaultFailure("NETWORK_ERROR");
  } finally {
    dependencies.clearTimer(timer);
    setController(null);
  }
}

export function installTask51MemoryVaultWorker(
  scope: MinimalWorkerScope,
  dependencies: Task51VaultWorkerDependencies = {
    fetch: globalThis.fetch.bind(globalThis),
    crypto: globalThis.crypto,
    now: () => Date.now(),
    serviceWorkerController: currentWorkerServiceWorkerController,
    setTimer: globalThis.setTimeout.bind(globalThis),
    clearTimer: globalThis.clearTimeout.bind(globalThis),
  }
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const ledger = createEvidenceLedgerRuntime();
  const tokenSlots = new Map<RunnerRole, TokenSlot>();
  const readinessBindings = new Map<string, IdentityBinding>();
  const crossNodeBindings = new Map<RunnerRole, IdentityBinding>();
  const baselineRecords = new Map<string, BaselineRecord>();
  const openPorts = new Set<MessagePort>();
  let stage: VaultStage = "CAPTURING";
  let deadlineAtMs: number | null = null;
  let activeController: AbortController | null = null;
  let terminal = false;
  let running = false;
  let pendingRole: RunnerRole | null = null;
  let captureEpoch = 0;

  const postSafe = (message: Task51VaultWorkerSafeMessage) => {
    assertSafeRunnerOutput(message);
    scope.postMessage(message);
  };

  const clearSecrets = () => {
    captureEpoch += 1;
    activeController?.abort();
    activeController = null;
    for (const slot of tokenSlots.values()) slot.bytes.fill(0);
    tokenSlots.clear();
    readinessBindings.clear();
    crossNodeBindings.clear();
    baselineRecords.clear();
    for (const port of openPorts) port.close();
    openPorts.clear();
    deadlineAtMs = null;
    pendingRole = null;
  };

  const fail = (code: RunnerFailureCode) => {
    if (terminal) {
      clearSecrets();
      return;
    }
    terminal = true;
    stage = "TERMINAL";
    clearSecrets();
    postSafe({
      protocol: PROTOCOL,
      type: "FAILED",
      code,
      burnedCells: ledger.burnedKeys.size,
    });
  };

  const ensureTtlBudget = () => {
    if (deadlineAtMs === null || deadlineAtMs <= dependencies.now()) {
      throw new VaultFailure("PAGE_DEADLINE_EXCEEDED");
    }
    for (const slot of tokenSlots.values()) {
      if (slot.expiresAtMs <= deadlineAtMs + CLOCK_SKEW_MS) {
        throw new VaultFailure("TTL_INSUFFICIENT");
      }
    }
  };

  const inspectResponse = async (
    cell: EvidenceLedgerCell,
    httpStatus: number,
    body: unknown
  ): Promise<InspectedResponse> => {
    if (!isRecord(body)) throw new VaultFailure("RESPONSE_SCHEMA_REJECTED");

    if (cell.path === "/v1/user/info") {
      if (httpStatus !== 200 || body.success !== true || !isRecord(body.data)) {
        throw new VaultFailure("HTTP_STATUS_REJECTED");
      }
      const roles = normalizeRoles(body.data.roles);
      const exactRole = primaryRole(roles) === cell.role;
      if (!exactRole) throw new VaultFailure("ROLE_MISMATCH");
      const subjectBytes = encoder.encode(numericSubject(body.data.id));
      const subjectFingerprint = await sha256Hex(
        dependencies.crypto,
        subjectBytes
      );
      subjectBytes.fill(0);
      const organizations = Array.isArray(body.data.organizations)
        ? body.data.organizations.length
        : 0;
      const permissions = Array.isArray(body.data.perms)
        ? body.data.perms.length
        : 0;
      return {
        projection: canonicalProjection({
          kind: "user-info",
          decision: "allow",
          primaryRole: cell.role,
          roleCount: roles.length,
          organizationCount: organizations,
          permissionCount: permissions,
        }),
        decisionMatched: true,
        roleExact: true,
        identity: {
          subjectFingerprint,
          roleSet: JSON.stringify(roles),
        },
      };
    }

    if (cell.path === "/v1/plugin/verify-token") {
      if (httpStatus !== 200 || body.code !== 0 || !isRecord(body.data)) {
        throw new VaultFailure("HTTP_STATUS_REJECTED");
      }
      const roles = normalizeRoles(body.data.roles);
      const exactRole = primaryRole(roles) === cell.role;
      if (!exactRole) throw new VaultFailure("ROLE_MISMATCH");
      const subjectBytes = encoder.encode(numericSubject(body.data.id));
      const subjectFingerprint = await sha256Hex(
        dependencies.crypto,
        subjectBytes
      );
      subjectBytes.fill(0);
      const organizations = Array.isArray(body.data.organizations)
        ? body.data.organizations.length
        : 0;
      return {
        projection: canonicalProjection({
          kind: "plugin-verify",
          decision: "allow",
          primaryRole: cell.role,
          roleCount: roles.length,
          organizationCount: organizations,
        }),
        decisionMatched: true,
        roleExact: true,
        identity: {
          subjectFingerprint,
          roleSet: JSON.stringify(roles),
        },
      };
    }

    const shouldAllow = cell.role === "admin" || cell.role === "root";
    if (shouldAllow) {
      if (httpStatus !== 200 || body.code !== 0 || !Array.isArray(body.data)) {
        throw new VaultFailure("HTTP_STATUS_REJECTED");
      }
      return {
        projection: canonicalProjection({
          kind: "organization-list",
          decision: "allow",
          itemCount: body.data.length,
        }),
        decisionMatched: true,
        roleExact: null,
        identity: null,
      };
    }

    if (
      httpStatus !== 403 ||
      typeof body.code !== "number" ||
      body.code === 0
    ) {
      throw new VaultFailure("HTTP_STATUS_REJECTED");
    }
    return {
      projection: canonicalProjection({
        kind: "organization-list",
        decision: "deny",
      }),
      decisionMatched: true,
      roleExact: null,
      identity: null,
    };
  };

  const verifyIdentity = (
    cell: EvidenceLedgerCell,
    identity: IdentityBinding | null
  ): boolean | null => {
    if (!identity) return null;
    const localKey = `${cell.node}|${cell.role}`;

    if (cell.phase === "readiness") {
      readinessBindings.set(localKey, identity);
      const first = crossNodeBindings.get(cell.role);
      if (!first) {
        crossNodeBindings.set(cell.role, identity);
        return null;
      }
      if (
        first.subjectFingerprint !== identity.subjectFingerprint ||
        first.roleSet !== identity.roleSet
      ) {
        throw new VaultFailure("SUBJECT_MISMATCH");
      }
      return true;
    }

    const readiness = readinessBindings.get(localKey);
    if (
      !readiness ||
      readiness.subjectFingerprint !== identity.subjectFingerprint ||
      readiness.roleSet !== identity.roleSet
    ) {
      throw new VaultFailure("SUBJECT_MISMATCH");
    }
    return true;
  };

  const fetchCell = async (
    cell: EvidenceLedgerCell
  ): Promise<SafeCellResult> => {
    const slot = tokenSlots.get(cell.role);
    if (!slot) throw new VaultFailure("RESPONSE_SCHEMA_REJECTED");
    const url = `${API_ORIGIN_BY_NODE[cell.node]}${cell.path}`;
    const baselineKey = `${cell.node}|${cell.role}|${cell.path}`;
    let bodyBytes: Uint8Array | null = null;

    try {
      const result = await withRequestDeadline(
        dependencies,
        (controller) => {
          activeController = controller;
        },
        async (signal) => {
          const response = await (async () => {
            let bearer = decoder.decode(slot.bytes);
            try {
              if (dependencies.serviceWorkerController() !== null) {
                throw new VaultFailure("SERVICE_WORKER_ACTIVE");
              }
              return await dependencies.fetch(url, {
                method: "GET",
                mode: "cors",
                credentials: "omit",
                redirect: "error",
                cache: "no-store",
                referrerPolicy: "no-referrer",
                keepalive: false,
                signal,
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${bearer}`,
                },
              });
            } finally {
              bearer = "";
            }
          })();
          if (response.redirected || response.url !== url) {
            throw new VaultFailure("REDIRECT_REJECTED");
          }
          bodyBytes = await readBodyLimited(
            response,
            EVIDENCE_RESPONSE_MAX_BYTES
          );
          const rawFingerprint = await sha256Hex(
            dependencies.crypto,
            bodyBytes
          );
          let parsed: unknown;
          try {
            parsed = JSON.parse(decoder.decode(bodyBytes));
          } catch {
            throw new VaultFailure("RESPONSE_SCHEMA_REJECTED");
          }
          const inspected = await inspectResponse(
            cell,
            response.status,
            parsed
          );
          parsed = null;
          const crossNodeIdentityMatched = verifyIdentity(
            cell,
            inspected.identity
          );
          const roleSubjectDigest =
            inspected.identity?.subjectFingerprint ??
            readinessBindings.get(`${cell.node}|${cell.role}`)
              ?.subjectFingerprint;
          if (
            typeof roleSubjectDigest !== "string" ||
            !/^[a-f0-9]{64}$/.test(roleSubjectDigest) ||
            roleSubjectDigest === "0".repeat(64)
          ) {
            throw new VaultFailure("SUBJECT_MISMATCH");
          }
          let baselineParityMatched: boolean | null = null;

          if (cell.phase === "baseline") {
            baselineRecords.set(baselineKey, {
              httpStatus: response.status,
              rawFingerprint,
              projection: inspected.projection,
            });
          } else if (cell.phase === "shadow") {
            const baseline = baselineRecords.get(baselineKey);
            baselineParityMatched = Boolean(
              baseline &&
                baseline.httpStatus === response.status &&
                baseline.rawFingerprint === rawFingerprint &&
                baseline.projection === inspected.projection
            );
            if (!baselineParityMatched) {
              throw new VaultFailure("RESPONSE_PARITY_MISMATCH");
            }
          }

          return {
            ledgerKey: cell.key,
            phase: cell.phase,
            node: cell.node,
            role: cell.role,
            roleSubjectDigest,
            path: cell.path,
            httpStatus: response.status,
            transportPassed: true,
            schemaPassed: true,
            expectedDecisionMatched: inspected.decisionMatched,
            baselineParityMatched,
            roleExact: inspected.roleExact,
            crossNodeIdentityMatched,
          } satisfies SafeCellResult;
        }
      );
      return result;
    } finally {
      const bytesToClear = bodyBytes as Uint8Array | null;
      bytesToClear?.fill(0);
      bodyBytes = null;
    }
  };

  const runCells = async (
    phase: "readiness" | "baseline" | "shadow",
    node: RunnerNode | null
  ) => {
    if (running) throw new VaultFailure("DUPLICATE_DISPATCH");
    running = true;
    ensureTtlBudget();
    const cells = EVIDENCE_LEDGER.filter(
      (cell) => cell.phase === phase && (node === null || cell.node === node)
    );
    try {
      for (const cell of cells) {
        const burnedCells = burnLedgerCell(ledger, cell.key);
        postSafe({
          protocol: PROTOCOL,
          type: "PROGRESS",
          burnedCells,
          totalCells: 56,
        });
        const safeCell = await fetchCell(cell);
        postSafe({
          protocol: PROTOCOL,
          type: "CELL_RESULT",
          cell: safeCell,
        });
      }
    } finally {
      running = false;
    }

    let ordinaryUserNegativePassed: boolean | null = null;
    let rootBreakGlassPassed: boolean | null = null;
    if (phase !== "readiness") {
      const relevant = cells.filter(
        (cell) => cell.path === "/v1/organization/list"
      );
      ordinaryUserNegativePassed = relevant
        .filter((cell) => cell.role === "user")
        .every((cell) => {
          const record =
            phase === "baseline"
              ? baselineRecords.get(`${cell.node}|${cell.role}|${cell.path}`)
              : baselineRecords.get(`${cell.node}|${cell.role}|${cell.path}`);
          return record?.httpStatus === 403;
        });
      rootBreakGlassPassed = relevant
        .filter((cell) => cell.role === "root")
        .every((cell) =>
          baselineRecords.has(`${cell.node}|${cell.role}|${cell.path}`)
        );
    }

    postSafe({
      protocol: PROTOCOL,
      type: "PHASE_COMPLETED",
      phase,
      node,
      phaseCells: cells.length,
      burnedCells: ledger.burnedKeys.size,
      ordinaryUserNegativePassed,
      rootBreakGlassPassed,
    });
  };

  const acceptCapture = async (
    expectedRole: RunnerRole,
    port: MessagePort,
    message: unknown,
    expectedCaptureEpoch: number
  ) => {
    if (!isCapturePortMessage(message) || message.role !== expectedRole) {
      throw new VaultFailure("RESPONSE_SCHEMA_REJECTED");
    }
    if (message.type === "CAPTURE_FAILED") {
      throw new VaultFailure(message.code);
    }
    const bytes = new Uint8Array(message.accessBytes);
    let committed = false;
    try {
      const expectedIndex = tokenSlots.size;
      if (
        ROLES[expectedIndex] !== expectedRole ||
        tokenSlots.has(expectedRole)
      ) {
        throw new VaultFailure("DUPLICATE_DISPATCH");
      }
      if (
        bytes.byteLength === 0 ||
        message.expiresAtMs - dependencies.now() < MIN_TOKEN_TTL_MS ||
        deadlineAtMs === null ||
        message.expiresAtMs <= deadlineAtMs + CLOCK_SKEW_MS
      ) {
        throw new VaultFailure("TTL_INSUFFICIENT");
      }
      const fingerprint = await sha256Hex(dependencies.crypto, bytes);
      if (
        terminal ||
        captureEpoch !== expectedCaptureEpoch ||
        stage !== "CAPTURING" ||
        pendingRole !== expectedRole ||
        !openPorts.has(port) ||
        ROLES[tokenSlots.size] !== expectedRole ||
        tokenSlots.has(expectedRole)
      ) {
        throw new VaultFailure("INVALID_TRANSITION");
      }
      if (
        [...tokenSlots.values()].some(
          (slot) => slot.fingerprint === fingerprint
        )
      ) {
        throw new VaultFailure("DUPLICATE_BEARER");
      }
      tokenSlots.set(expectedRole, {
        bytes,
        expiresAtMs: message.expiresAtMs,
        fingerprint,
      });
      committed = true;
      port.close();
      openPorts.delete(port);
      pendingRole = null;
      if (tokenSlots.size === ROLES.length) stage = "READY_FOR_READINESS";
      postSafe({
        protocol: PROTOCOL,
        type: "CAPTURE_ACCEPTED",
        role: expectedRole,
        acceptedCount: tokenSlots.size,
        loginHttpStatus: message.loginHttpStatus,
        logoutHttpStatus: message.logoutHttpStatus,
        roleExact: true,
        ttlSufficient: true,
      });
    } finally {
      if (!committed) bytes.fill(0);
    }
  };

  const handleCommand = async (command: Task51VaultWorkerCommand) => {
    if (terminal && command.type !== "CLEAR") return;

    switch (command.type) {
      case "INIT_RUN":
        if (
          deadlineAtMs !== null ||
          command.deadlineAtMs <= dependencies.now()
        ) {
          throw new VaultFailure("DUPLICATE_DISPATCH");
        }
        deadlineAtMs = command.deadlineAtMs;
        break;
      case "ATTACH_CAPTURE_PORT": {
        if (stage !== "CAPTURING" || deadlineAtMs === null) {
          throw new VaultFailure("INVALID_TRANSITION");
        }
        if (ROLES[tokenSlots.size] !== command.role || pendingRole !== null) {
          throw new VaultFailure("INVALID_TRANSITION");
        }
        pendingRole = command.role;
        const expectedCaptureEpoch = captureEpoch;
        const port = command.port;
        openPorts.add(port);
        let consumed = false;
        port.onmessage = (event: MessageEvent<unknown>) => {
          if (consumed) {
            fail("DUPLICATE_DISPATCH");
            return;
          }
          consumed = true;
          void acceptCapture(
            command.role,
            port,
            event.data,
            expectedCaptureEpoch
          ).catch((error) => {
            pendingRole = null;
            fail(error instanceof VaultFailure ? error.code : "WORKER_ERROR");
          });
        };
        port.onmessageerror = () => fail("WORKER_ERROR");
        port.start();
        break;
      }
      case "RUN_READINESS":
        if (stage !== "READY_FOR_READINESS") {
          throw new VaultFailure("INVALID_TRANSITION");
        }
        await runCells("readiness", null);
        stage = "READY_FOR_BASELINE";
        break;
      case "RUN_BASELINE":
        if (stage !== "READY_FOR_BASELINE") {
          throw new VaultFailure("INVALID_TRANSITION");
        }
        await runCells("baseline", null);
        stage = "READY_FOR_XRTEETH_SHADOW";
        break;
      case "RUN_XRTEETH_SHADOW":
        if (stage !== "READY_FOR_XRTEETH_SHADOW") {
          throw new VaultFailure("INVALID_TRANSITION");
        }
        await runCells("shadow", "xrteeth");
        stage = "WAIT_XRTEETH_RESTORED";
        break;
      case "ACK_XRTEETH_RESTORED":
        if (stage !== "WAIT_XRTEETH_RESTORED") {
          throw new VaultFailure("INVALID_TRANSITION");
        }
        stage = "READY_FOR_TMRPP_SHADOW";
        break;
      case "RUN_TMRPP_SHADOW":
        if (stage !== "READY_FOR_TMRPP_SHADOW") {
          throw new VaultFailure("INVALID_TRANSITION");
        }
        await runCells("shadow", "tmrpp");
        stage = "TMRPP_SHADOW_COMPLETE";
        break;
      case "CLEAR":
        terminal = true;
        stage = "TERMINAL";
        clearSecrets();
        postSafe({
          protocol: PROTOCOL,
          type: "CLEARED",
          workerReferencesCleared: true,
        });
        scope.close();
        break;
    }
  };

  scope.onmessage = (event: MessageEvent<unknown>) => {
    if (!isTask51VaultWorkerCommand(event.data)) {
      fail("WORKER_ERROR");
      return;
    }
    void handleCommand(event.data).catch((error) => {
      fail(error instanceof VaultFailure ? error.code : "WORKER_ERROR");
    });
  };

  postSafe({ protocol: PROTOCOL, type: "READY" });

  return {
    clearSecrets,
    getBurnedCellCount: () => ledger.burnedKeys.size,
    getStage: () => stage,
  };
}

if (
  typeof document === "undefined" &&
  typeof globalThis.postMessage === "function"
) {
  installTask51MemoryVaultWorker(globalThis as unknown as MinimalWorkerScope);
}
