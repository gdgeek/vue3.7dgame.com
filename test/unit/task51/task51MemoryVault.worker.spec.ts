import { describe, expect, it, vi } from "vitest";

import {
  EVIDENCE_RESPONSE_MAX_BYTES,
  EVIDENCE_LEDGER,
  MIN_TOKEN_TTL_MS,
  PAGE_DEADLINE_MS,
  PROTOCOL,
  ROLES,
  type EvidenceLedgerCell,
  type RunnerRole,
} from "@/services/task51/memoryRunnerProtocol";
import {
  installTask51MemoryVaultWorker,
  type Task51VaultWorkerCommand,
  type Task51VaultWorkerDependencies,
  type Task51VaultWorkerSafeMessage,
} from "@/workers/task51MemoryVault.worker";

const NOW_MS = 1_800_000_000_000;

type FetchCall = {
  url: string;
  init: RequestInit | undefined;
};

type FakePort = MessagePort & {
  close: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
};

async function testDigest(data: BufferSource): Promise<ArrayBuffer> {
  const input = new Uint8Array(data as ArrayBuffer);
  const output = new Uint8Array(32);
  let state = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    state ^= input[index];
    state = Math.imul(state, 16_777_619) >>> 0;
    output[index % output.length] ^= state & 0xff;
    output[(index * 7) % output.length] ^= (state >>> 8) & 0xff;
  }
  for (let index = 0; index < output.length; index += 1) {
    output[index] ^= (state >>> ((index % 4) * 8)) & 0xff;
  }
  return output.buffer;
}

function testDigestCrypto(): Crypto {
  return {
    subtle: {
      digest: async (_algorithm: AlgorithmIdentifier, data: BufferSource) =>
        testDigest(data),
    } as SubtleCrypto,
  } as Crypto;
}

function createDeferredDigestCrypto() {
  let releaseFirstDigest: (() => void) | null = null;
  let markFirstDigestStarted: (() => void) | null = null;
  let digestCalls = 0;
  const firstDigestGate = new Promise<void>((resolve) => {
    releaseFirstDigest = resolve;
  });
  const firstDigestStarted = new Promise<void>((resolve) => {
    markFirstDigestStarted = resolve;
  });
  const crypto = {
    subtle: {
      digest: async (_algorithm: AlgorithmIdentifier, data: BufferSource) => {
        digestCalls += 1;
        if (digestCalls === 1) {
          markFirstDigestStarted?.();
          await firstDigestGate;
        }
        return testDigest(data);
      },
    } as SubtleCrypto,
  } as Crypto;

  return {
    crypto,
    firstDigestStarted,
    releaseFirstDigest: () => releaseFirstDigest?.(),
  };
}

function createDeferredEvidenceDigestCrypto() {
  let releaseEvidenceDigest: (() => void) | null = null;
  let markEvidenceDigestStarted: (() => void) | null = null;
  let digestCalls = 0;
  const evidenceDigestGate = new Promise<void>((resolve) => {
    releaseEvidenceDigest = resolve;
  });
  const evidenceDigestStarted = new Promise<void>((resolve) => {
    markEvidenceDigestStarted = resolve;
  });
  const crypto = {
    subtle: {
      digest: async (_algorithm: AlgorithmIdentifier, data: BufferSource) => {
        digestCalls += 1;
        // Four token fingerprints are calculated during capture. The fifth
        // digest is the first response fingerprint inside the request deadline.
        if (digestCalls === ROLES.length + 1) {
          markEvidenceDigestStarted?.();
          await evidenceDigestGate;
        }
        return testDigest(data);
      },
    } as SubtleCrypto,
  } as Crypto;

  return {
    crypto,
    evidenceDigestStarted,
    releaseEvidenceDigest: () => releaseEvidenceDigest?.(),
  };
}

const urlForCell = (cell: EvidenceLedgerCell) =>
  `https://api.${cell.node}.com${cell.path}`;

function responseForCell(
  cell: EvidenceLedgerCell,
  options: { url?: string; redirected?: boolean } = {}
): Response {
  const subjectId = 900_001 + ROLES.indexOf(cell.role);
  let body: Record<string, unknown>;
  let status = 200;

  if (cell.path === "/v1/user/info") {
    body = {
      success: true,
      data: {
        id: subjectId,
        roles: [cell.role],
        perms: [],
        organizations: [],
      },
    };
  } else if (cell.path === "/v1/plugin/verify-token") {
    body = {
      code: 0,
      data: {
        id: subjectId,
        roles: [cell.role],
        organizations: [],
      },
    };
  } else if (cell.role === "admin" || cell.role === "root") {
    body = { code: 0, data: [] };
  } else {
    status = 403;
    body = { code: 2003 };
  }

  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  Object.defineProperties(response, {
    redirected: {
      configurable: true,
      value: options.redirected ?? false,
    },
    url: {
      configurable: true,
      value: options.url ?? urlForCell(cell),
    },
  });
  return response;
}

function responseForJson(
  cell: EvidenceLedgerCell,
  body: unknown,
  status = 200
): Response {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  Object.defineProperties(response, {
    redirected: { configurable: true, value: false },
    url: { configurable: true, value: urlForCell(cell) },
  });
  return response;
}

function responseForText(
  cell: EvidenceLedgerCell,
  body: string,
  status = 200
): Response {
  const response = new Response(body, { status });
  Object.defineProperties(response, {
    redirected: { configurable: true, value: false },
    url: { configurable: true, value: urlForCell(cell) },
  });
  return response;
}

function makeFakePort(): FakePort {
  return {
    onmessage: null,
    onmessageerror: null,
    postMessage: vi.fn(),
    close: vi.fn(),
    start: vi.fn(),
  } as unknown as FakePort;
}

function syntheticAccessBuffer(role: RunnerRole): ArrayBuffer {
  const encoded = new TextEncoder().encode(
    `TEST_ONLY_MEMORY_CREDENTIAL_${ROLES.indexOf(role)}`
  );
  const accessBuffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(accessBuffer).set(encoded);
  encoded.fill(0);
  return accessBuffer;
}

type HarnessOptions = {
  crypto?: Crypto;
  failAtCall?: number;
  responseForCall?: (cell: EvidenceLedgerCell, callIndex: number) => Response;
  serviceWorkerController?: () => unknown | null;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
};

function createHarness(options: HarnessOptions = {}) {
  const messages: Task51VaultWorkerSafeMessage[] = [];
  const fetchCalls: FetchCall[] = [];
  const waiters: Array<{
    predicate: (message: Task51VaultWorkerSafeMessage) => boolean;
    resolve: (message: Task51VaultWorkerSafeMessage) => void;
    reject: (error: Error) => void;
  }> = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const scope = {
    onmessage: null as ((event: MessageEvent<unknown>) => void) | null,
    postMessage(message: unknown) {
      const safeMessage = message as Task51VaultWorkerSafeMessage;
      queueMicrotask(() => {
        messages.push(safeMessage);
        for (let index = waiters.length - 1; index >= 0; index -= 1) {
          if (waiters[index].predicate(safeMessage)) {
            const [{ resolve }] = waiters.splice(index, 1);
            resolve(safeMessage);
          } else if (safeMessage.type === "FAILED") {
            const [{ reject }] = waiters.splice(index, 1);
            reject(new Error(`TASK51_TEST_EARLY_FAILURE:${safeMessage.code}`));
          }
        }
      });
    },
    close: vi.fn(),
  };

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const callIndex = fetchCalls.length;
      fetchCalls.push({ url: String(input), init });
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        // A yield makes accidental parallel dispatch observable to maxInFlight.
        await Promise.resolve();
        if (options.failAtCall === callIndex) {
          throw new Error("TEST_ONLY_NETWORK_FAILURE");
        }
        const cell = EVIDENCE_LEDGER[callIndex];
        if (!cell) throw new Error("TEST_ONLY_UNEXPECTED_FETCH");
        return (
          options.responseForCall?.(cell, callIndex) ?? responseForCell(cell)
        );
      } finally {
        inFlight -= 1;
      }
    }
  );

  const dependencies: Task51VaultWorkerDependencies = {
    fetch: fetchMock as typeof fetch,
    crypto: options.crypto ?? testDigestCrypto(),
    now: () => NOW_MS,
    serviceWorkerController: options.serviceWorkerController ?? (() => null),
    setTimer: options.setTimer ?? ((() => 1) as unknown as typeof setTimeout),
    clearTimer:
      options.clearTimer ?? (vi.fn() as unknown as typeof clearTimeout),
  };

  const controls = installTask51MemoryVaultWorker(scope, dependencies);

  const send = (command: Task51VaultWorkerCommand) => {
    scope.onmessage?.({ data: command } as MessageEvent<unknown>);
  };

  const waitFor = (
    predicate: (message: Task51VaultWorkerSafeMessage) => boolean
  ): Promise<Task51VaultWorkerSafeMessage> => {
    const existing = messages.find(predicate);
    if (existing) return Promise.resolve(existing);
    const earlyFailure = messages.find(
      (
        message
      ): message is Extract<Task51VaultWorkerSafeMessage, { type: "FAILED" }> =>
        message.type === "FAILED"
    );
    if (earlyFailure) {
      return Promise.reject(
        new Error(`TASK51_TEST_EARLY_FAILURE:${earlyFailure.code}`)
      );
    }
    return new Promise((resolve, reject) =>
      waiters.push({ predicate, resolve, reject })
    );
  };

  return {
    controls,
    dependencies,
    fetchCalls,
    getMaxInFlight: () => maxInFlight,
    messages,
    scope,
    send,
    waitFor,
  };
}

async function waitUntil(predicate: () => boolean) {
  for (let index = 0; index < 50; index += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("TASK51_TEST_WAIT_CONDITION_NOT_REACHED");
}

async function flushMicrotasks(turns = 10) {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

async function initializeAndCapture(
  harness: ReturnType<typeof createHarness>
): Promise<{ buffers: ArrayBuffer[]; ports: FakePort[] }> {
  harness.send({
    protocol: PROTOCOL,
    type: "INIT_RUN",
    deadlineAtMs: NOW_MS + PAGE_DEADLINE_MS,
  });

  const buffers: ArrayBuffer[] = [];
  const ports: FakePort[] = [];
  for (const role of ROLES) {
    const port = makeFakePort();
    const accessBytes = syntheticAccessBuffer(role);
    buffers.push(accessBytes);
    ports.push(port);
    harness.send({
      protocol: PROTOCOL,
      type: "ATTACH_CAPTURE_PORT",
      role,
      port,
    });
    port.onmessage?.({
      data: {
        protocol: PROTOCOL,
        type: "CAPTURE_OK",
        role,
        accessBytes,
        expiresAtMs: NOW_MS + PAGE_DEADLINE_MS + MIN_TOKEN_TTL_MS,
        loginHttpStatus: 200,
        logoutHttpStatus: 200,
      },
    } as MessageEvent<unknown>);
    await harness.waitFor(
      (message) => message.type === "CAPTURE_ACCEPTED" && message.role === role
    );
  }

  return { buffers, ports };
}

async function runThroughXrteethShadow(
  harness: ReturnType<typeof createHarness>
) {
  harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
  await harness.waitFor(
    (message) =>
      message.type === "PHASE_COMPLETED" && message.phase === "readiness"
  );
  harness.send({ protocol: PROTOCOL, type: "RUN_BASELINE" });
  await harness.waitFor(
    (message) =>
      message.type === "PHASE_COMPLETED" && message.phase === "baseline"
  );
  harness.send({ protocol: PROTOCOL, type: "RUN_XRTEETH_SHADOW" });
  await harness.waitFor(
    (message) =>
      message.type === "PHASE_COMPLETED" &&
      message.phase === "shadow" &&
      message.node === "xrteeth"
  );
}

function forbiddenOutputKeys(value: unknown): string[] {
  const forbidden =
    /password|token|bearer|authorization|cookie|credential|secret|username|profile|subject|digest|rawbody|responsebody|requestbody|jwt/i;
  const hits: string[] = [];
  const visit = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, entry] of Object.entries(candidate)) {
      const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (normalized !== "rolesubjectdigest" && forbidden.test(normalized)) {
        hits.push(key);
      }
      visit(entry);
    }
  };
  visit(value);
  return hits;
}

describe("task51MemoryVault.worker", () => {
  it("runs the fixed 56 GETs serially with exact flags and safe parity evidence", async () => {
    const harness = createHarness();
    const { buffers } = await initializeAndCapture(harness);

    await runThroughXrteethShadow(harness);
    harness.send({ protocol: PROTOCOL, type: "ACK_XRTEETH_RESTORED" });
    harness.send({ protocol: PROTOCOL, type: "RUN_TMRPP_SHADOW" });
    await harness.waitFor(
      (message) =>
        message.type === "PHASE_COMPLETED" &&
        message.phase === "shadow" &&
        message.node === "tmrpp"
    );

    expect(harness.fetchCalls).toHaveLength(56);
    expect(harness.getMaxInFlight()).toBe(1);
    expect(harness.controls.getBurnedCellCount()).toBe(56);
    expect(harness.fetchCalls.map(({ url }) => url)).toEqual(
      EVIDENCE_LEDGER.map((cell) => `https://api.${cell.node}.com${cell.path}`)
    );

    for (const { init } of harness.fetchCalls) {
      expect(init).toMatchObject({
        method: "GET",
        mode: "cors",
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        keepalive: false,
      });
      expect(init?.body).toBeUndefined();
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: expect.stringMatching(/^Bearer TEST_ONLY_/),
      });
    }

    const cells = harness.messages.filter(
      (
        message
      ): message is Extract<
        Task51VaultWorkerSafeMessage,
        { type: "CELL_RESULT" }
      > => message.type === "CELL_RESULT"
    );
    expect(cells).toHaveLength(56);
    const roleSubjectDigests = new Map(
      ROLES.map((role) => [
        role,
        cells.find(({ cell }) => cell.role === role)?.cell.roleSubjectDigest,
      ])
    );
    expect(
      [...roleSubjectDigests.values()].every(
        (digest) =>
          typeof digest === "string" &&
          /^[a-f0-9]{64}$/.test(digest) &&
          digest !== "0".repeat(64)
      )
    ).toBe(true);
    expect(new Set(roleSubjectDigests.values()).size).toBe(4);
    expect(
      cells.every(
        ({ cell }) =>
          cell.roleSubjectDigest === roleSubjectDigests.get(cell.role)
      )
    ).toBe(true);

    const readiness = cells.filter(({ cell }) => cell.phase === "readiness");
    expect(readiness).toHaveLength(8);
    for (const role of ROLES) {
      const roleCells = readiness.filter(({ cell }) => cell.role === role);
      expect(roleCells).toHaveLength(2);
      expect(roleCells[0].cell.roleExact).toBe(true);
      expect(roleCells[0].cell.crossNodeIdentityMatched).toBeNull();
      expect(roleCells[1].cell.roleExact).toBe(true);
      expect(roleCells[1].cell.crossNodeIdentityMatched).toBe(true);
    }

    const baseline = cells.filter(({ cell }) => cell.phase === "baseline");
    const shadow = cells.filter(({ cell }) => cell.phase === "shadow");
    expect(baseline).toHaveLength(24);
    expect(shadow).toHaveLength(24);
    expect(
      baseline.every(({ cell }) => cell.baselineParityMatched === null)
    ).toBe(true);
    expect(
      shadow.every(({ cell }) => cell.baselineParityMatched === true)
    ).toBe(true);

    const organizationCells = cells.filter(
      ({ cell }) => cell.path === "/v1/organization/list"
    );
    for (const { cell } of organizationCells) {
      expect(cell.httpStatus).toBe(
        cell.role === "admin" || cell.role === "root" ? 200 : 403
      );
      expect(cell.expectedDecisionMatched).toBe(true);
    }
    const completedPhases = harness.messages.filter(
      (
        message
      ): message is Extract<
        Task51VaultWorkerSafeMessage,
        { type: "PHASE_COMPLETED" }
      > => message.type === "PHASE_COMPLETED"
    );
    expect(
      completedPhases
        .filter(({ phase }) => phase !== "readiness")
        .every(
          ({ ordinaryUserNegativePassed, rootBreakGlassPassed }) =>
            ordinaryUserNegativePassed === true && rootBreakGlassPassed === true
        )
    ).toBe(true);

    expect(forbiddenOutputKeys(harness.messages)).toEqual([]);
    expect(
      forbiddenOutputKeys({
        roleSubjectDigest: "1".repeat(64),
        subject: "TEST_ONLY_RAW_SUBJECT",
      })
    ).toEqual(["subject"]);
    const serialized = JSON.stringify(harness.messages);
    for (const role of ROLES) {
      expect(serialized).not.toContain(
        `TEST_ONLY_MEMORY_CREDENTIAL_${ROLES.indexOf(role)}`
      );
    }
    for (const buffer of buffers) {
      expect(new Uint8Array(buffer).some((value) => value !== 0)).toBe(true);
    }
  });

  it.each([
    ["an empty response URL", "", false],
    [
      "a mismatched response URL",
      "https://api.xrteeth.com/v1/plugin/verify-token",
      false,
    ],
    ["a redirected response", urlForCell(EVIDENCE_LEDGER[0]), true],
  ] as const)(
    "rejects %s before inspecting the body",
    async (_label, url, redirected) => {
      const harness = createHarness({
        responseForCall: (cell) => responseForCell(cell, { redirected, url }),
      });
      const { buffers } = await initializeAndCapture(harness);

      harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
      const failed = await harness.waitFor(
        (message) => message.type === "FAILED"
      );

      expect(failed).toMatchObject({
        type: "FAILED",
        code: "REDIRECT_REJECTED",
        burnedCells: 1,
      });
      expect(harness.fetchCalls).toHaveLength(1);
      expect(
        harness.messages.filter((message) => message.type === "CELL_RESULT")
      ).toHaveLength(0);
      expect(
        buffers.every((buffer) =>
          new Uint8Array(buffer).every((value) => value === 0)
        )
      ).toBe(true);
    }
  );

  it("fails closed before evidence dispatch when a service worker is active", async () => {
    const serviceWorkerController = vi.fn(() =>
      Object.freeze({ active: true })
    );
    const harness = createHarness({ serviceWorkerController });
    const { buffers } = await initializeAndCapture(harness);

    harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );

    expect(failed).toMatchObject({
      type: "FAILED",
      code: "SERVICE_WORKER_ACTIVE",
      burnedCells: 1,
    });
    expect(serviceWorkerController).toHaveBeenCalledOnce();
    expect(harness.fetchCalls).toHaveLength(0);
    expect(
      harness.messages.filter((message) => message.type === "CELL_RESULT")
    ).toHaveLength(0);
    expect(
      buffers.every((buffer) =>
        new Uint8Array(buffer).every((value) => value === 0)
      )
    ).toBe(true);
    expect(harness.controls.getStage()).toBe("TERMINAL");
  });

  it("fails closed when the deadline fires while response digesting is pending", async () => {
    const deferredDigest = createDeferredEvidenceDigestCrypto();
    let fireDeadline: (() => void) | null = null;
    const clearTimer = vi.fn() as unknown as typeof clearTimeout;
    const harness = createHarness({
      crypto: deferredDigest.crypto,
      setTimer: ((callback: TimerHandler) => {
        fireDeadline = callback as () => void;
        return 1;
      }) as unknown as typeof setTimeout,
      clearTimer,
    });
    const { buffers } = await initializeAndCapture(harness);

    harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
    await deferredDigest.evidenceDigestStarted;
    expect(fireDeadline).not.toBeNull();
    fireDeadline?.();
    deferredDigest.releaseEvidenceDigest();

    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );
    expect(failed).toMatchObject({
      type: "FAILED",
      code: "REQUEST_TIMEOUT",
      burnedCells: 1,
    });
    expect(harness.fetchCalls).toHaveLength(1);
    expect(
      harness.messages.filter((message) => message.type === "CELL_RESULT")
    ).toHaveLength(0);
    expect(
      buffers.every((buffer) =>
        new Uint8Array(buffer).every((value) => value === 0)
      )
    ).toBe(true);
    expect(clearTimer).toHaveBeenCalledOnce();
    expect(harness.controls.getStage()).toBe("TERMINAL");
  });

  it("rejects an evidence response larger than the exact 8 MiB limit", async () => {
    const oversizedBody = "x".repeat(EVIDENCE_RESPONSE_MAX_BYTES + 1);
    const harness = createHarness({
      responseForCall: (cell) => responseForText(cell, oversizedBody),
    });
    await initializeAndCapture(harness);

    harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );

    expect(failed).toMatchObject({
      type: "FAILED",
      code: "RESPONSE_TOO_LARGE",
      burnedCells: 1,
    });
    expect(harness.fetchCalls).toHaveLength(1);
    expect(
      harness.messages.filter((message) => message.type === "CELL_RESULT")
    ).toHaveLength(0);
  });

  it.each([
    {
      label: "HTTP status",
      expectedCode: "HTTP_STATUS_REJECTED",
      response: (cell: EvidenceLedgerCell) =>
        responseForJson(cell, { success: false }, 500),
    },
    {
      label: "response schema",
      expectedCode: "RESPONSE_SCHEMA_REJECTED",
      response: (cell: EvidenceLedgerCell) =>
        responseForJson(cell, {
          success: true,
          data: { roles: ["user"], perms: [], organizations: [] },
        }),
    },
    {
      label: "primary role",
      expectedCode: "ROLE_MISMATCH",
      response: (cell: EvidenceLedgerCell) =>
        responseForJson(cell, {
          success: true,
          data: {
            id: 900_001,
            roles: ["manager"],
            perms: [],
            organizations: [],
          },
        }),
    },
  ] as const)(
    "fails closed on a $label mismatch",
    async ({ expectedCode, response }) => {
      const harness = createHarness({ responseForCall: response });
      await initializeAndCapture(harness);

      harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
      const failed = await harness.waitFor(
        (message) => message.type === "FAILED"
      );

      expect(failed).toMatchObject({
        type: "FAILED",
        code: expectedCode,
        burnedCells: 1,
      });
      expect(harness.fetchCalls).toHaveLength(1);
      expect(
        harness.messages.filter((message) => message.type === "CELL_RESULT")
      ).toHaveLength(0);
    }
  );

  it("rejects a cross-node subject mismatch during readiness", async () => {
    const harness = createHarness({
      responseForCall: (cell, callIndex) =>
        callIndex === ROLES.length
          ? responseForJson(cell, {
              success: true,
              data: {
                id: 999_999,
                roles: [cell.role],
                perms: [],
                organizations: [],
              },
            })
          : responseForCell(cell),
    });
    await initializeAndCapture(harness);

    harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );

    expect(failed).toMatchObject({
      type: "FAILED",
      code: "SUBJECT_MISMATCH",
      burnedCells: ROLES.length + 1,
    });
    expect(harness.fetchCalls).toHaveLength(ROLES.length + 1);
  });

  it("rejects the first shadow response whose bytes drift from baseline", async () => {
    const firstShadowIndex = 8 + 24;
    const harness = createHarness({
      responseForCall: (cell, callIndex) =>
        callIndex === firstShadowIndex
          ? responseForJson(cell, {
              success: true,
              data: {
                id: 900_001,
                roles: ["user"],
                perms: ["TEST_ONLY_PARITY_DRIFT"],
                organizations: [],
              },
            })
          : responseForCell(cell),
    });
    await initializeAndCapture(harness);
    harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
    await harness.waitFor(
      (message) =>
        message.type === "PHASE_COMPLETED" && message.phase === "readiness"
    );
    harness.send({ protocol: PROTOCOL, type: "RUN_BASELINE" });
    await harness.waitFor(
      (message) =>
        message.type === "PHASE_COMPLETED" && message.phase === "baseline"
    );

    harness.send({ protocol: PROTOCOL, type: "RUN_XRTEETH_SHADOW" });
    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );

    expect(failed).toMatchObject({
      type: "FAILED",
      code: "RESPONSE_PARITY_MISMATCH",
      burnedCells: firstShadowIndex + 1,
    });
    expect(harness.fetchCalls).toHaveLength(firstShadowIndex + 1);
  });

  it("rejects a capture below the token TTL floor before any GET", async () => {
    const harness = createHarness();
    const port = makeFakePort();
    const accessBytes = syntheticAccessBuffer("user");
    harness.send({
      protocol: PROTOCOL,
      type: "INIT_RUN",
      deadlineAtMs: NOW_MS + PAGE_DEADLINE_MS,
    });
    harness.send({
      protocol: PROTOCOL,
      type: "ATTACH_CAPTURE_PORT",
      role: "user",
      port,
    });
    port.onmessage?.({
      data: {
        protocol: PROTOCOL,
        type: "CAPTURE_OK",
        role: "user",
        accessBytes,
        expiresAtMs: NOW_MS + MIN_TOKEN_TTL_MS - 1,
        loginHttpStatus: 200,
        logoutHttpStatus: 200,
      },
    } as MessageEvent<unknown>);

    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );
    expect(failed).toMatchObject({
      type: "FAILED",
      code: "TTL_INSUFFICIENT",
      burnedCells: 0,
    });
    expect(harness.fetchCalls).toHaveLength(0);
    expect(new Uint8Array(accessBytes).every((value) => value === 0)).toBe(
      true
    );
  });

  it("rejects a duplicate bearer across role slots", async () => {
    const harness = createHarness();
    harness.send({
      protocol: PROTOCOL,
      type: "INIT_RUN",
      deadlineAtMs: NOW_MS + PAGE_DEADLINE_MS,
    });
    const duplicateBytes = syntheticAccessBuffer("user");
    for (const role of ["user", "manager"] as const) {
      const port = makeFakePort();
      const accessBytes = duplicateBytes.slice(0);
      harness.send({
        protocol: PROTOCOL,
        type: "ATTACH_CAPTURE_PORT",
        role,
        port,
      });
      port.onmessage?.({
        data: {
          protocol: PROTOCOL,
          type: "CAPTURE_OK",
          role,
          accessBytes,
          expiresAtMs: NOW_MS + PAGE_DEADLINE_MS + MIN_TOKEN_TTL_MS,
          loginHttpStatus: 200,
          logoutHttpStatus: 200,
        },
      } as MessageEvent<unknown>);
      if (role === "user") {
        await harness.waitFor(
          (message) =>
            message.type === "CAPTURE_ACCEPTED" && message.role === "user"
        );
      }
    }

    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );
    expect(failed).toMatchObject({
      type: "FAILED",
      code: "DUPLICATE_BEARER",
      burnedCells: 0,
    });
    expect(harness.fetchCalls).toHaveLength(0);
  });

  it.each(["duplicate", "messageerror", "CLEAR"] as const)(
    "does not recommit capture bytes after terminal %s during digest",
    async (interleaving) => {
      const deferredDigest = createDeferredDigestCrypto();
      const harness = createHarness({ crypto: deferredDigest.crypto });
      const port = makeFakePort();
      const accessBytes = syntheticAccessBuffer("user");
      const captureMessage = {
        protocol: PROTOCOL,
        type: "CAPTURE_OK",
        role: "user",
        accessBytes,
        expiresAtMs: NOW_MS + PAGE_DEADLINE_MS + MIN_TOKEN_TTL_MS,
        loginHttpStatus: 200,
        logoutHttpStatus: 200,
      } as const;

      harness.send({
        protocol: PROTOCOL,
        type: "INIT_RUN",
        deadlineAtMs: NOW_MS + PAGE_DEADLINE_MS,
      });
      harness.send({
        protocol: PROTOCOL,
        type: "ATTACH_CAPTURE_PORT",
        role: "user",
        port,
      });
      port.onmessage?.({ data: captureMessage } as MessageEvent<unknown>);
      await deferredDigest.firstDigestStarted;

      if (interleaving === "duplicate") {
        port.onmessage?.({ data: captureMessage } as MessageEvent<unknown>);
        await harness.waitFor((message) => message.type === "FAILED");
      } else if (interleaving === "messageerror") {
        port.onmessageerror?.({} as MessageEvent<unknown>);
        await harness.waitFor((message) => message.type === "FAILED");
      } else {
        harness.send({ protocol: PROTOCOL, type: "CLEAR" });
        await harness.waitFor((message) => message.type === "CLEARED");
      }

      // Exercise CLEAR again after terminal, before the pending digest exits.
      harness.send({ protocol: PROTOCOL, type: "CLEAR" });
      deferredDigest.releaseFirstDigest();
      await waitUntil(() =>
        new Uint8Array(accessBytes).every((value) => value === 0)
      );
      await flushMicrotasks();

      expect(harness.controls.getStage()).toBe("TERMINAL");
      expect(
        harness.messages.filter(
          (message) => message.type === "CAPTURE_ACCEPTED"
        )
      ).toHaveLength(0);
      expect(port.close).toHaveBeenCalled();
      expect(harness.scope.close).toHaveBeenCalled();
    }
  );

  it("does not dispatch tmrpp shadow before the xrteeth restore acknowledgement", async () => {
    const harness = createHarness();
    await initializeAndCapture(harness);
    await runThroughXrteethShadow(harness);
    expect(harness.fetchCalls).toHaveLength(44);

    harness.send({ protocol: PROTOCOL, type: "RUN_TMRPP_SHADOW" });
    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );

    expect(failed).toMatchObject({
      type: "FAILED",
      code: "INVALID_TRANSITION",
      burnedCells: 44,
    });
    expect(harness.fetchCalls).toHaveLength(44);
    expect(harness.controls.getStage()).toBe("TERMINAL");
  });

  it("burns a failed cell, stops immediately and never retries it", async () => {
    const harness = createHarness({ failAtCall: 0 });
    await initializeAndCapture(harness);

    harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
    const failed = await harness.waitFor(
      (message) => message.type === "FAILED"
    );

    expect(failed).toMatchObject({
      type: "FAILED",
      code: "NETWORK_ERROR",
      burnedCells: 1,
    });
    expect(harness.fetchCalls).toHaveLength(1);
    expect(harness.controls.getBurnedCellCount()).toBe(1);

    harness.send({ protocol: PROTOCOL, type: "RUN_READINESS" });
    await Promise.resolve();
    expect(harness.fetchCalls).toHaveLength(1);
  });

  it("clears every captured byte and closes all references without network", async () => {
    const harness = createHarness();
    const { buffers, ports } = await initializeAndCapture(harness);
    expect(harness.fetchCalls).toHaveLength(0);
    expect(
      buffers.every((buffer) =>
        new Uint8Array(buffer).some((value) => value !== 0)
      )
    ).toBe(true);

    harness.send({ protocol: PROTOCOL, type: "CLEAR" });
    const cleared = await harness.waitFor(
      (message) => message.type === "CLEARED"
    );

    expect(cleared).toEqual({
      protocol: PROTOCOL,
      type: "CLEARED",
      workerReferencesCleared: true,
    });
    expect(harness.controls.getStage()).toBe("TERMINAL");
    expect(harness.controls.getBurnedCellCount()).toBe(0);
    expect(harness.fetchCalls).toHaveLength(0);
    expect(
      buffers.every((buffer) =>
        new Uint8Array(buffer).every((value) => value === 0)
      )
    ).toBe(true);
    expect(ports.every((port) => port.close.mock.calls.length === 1)).toBe(
      true
    );
    expect(harness.scope.close).toHaveBeenCalledOnce();
  });
});
