// @vitest-environment jsdom

import { createApp, nextTick, type App } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EXTERNAL_GATE_KEYS,
  FINAL_RESTORE_GATE_KEYS,
  PREFLIGHT_GATE_KEYS,
  PROTOCOL,
  STAGE_B_COORDINATOR_ORIGIN,
  STAGE_B_EXECUTION_EVIDENCE_MAX_BYTES,
  STAGE_B_EXECUTION_EVIDENCE_SCHEMA,
  STAGE_B_GLOBAL_CLAIM_RECEIPT_MAX_BYTES,
  STAGE_B_GLOBAL_CLAIM_RECEIPT_SCHEMA,
  SHADOW_OPEN_GATE_KEYS,
  XRTEETH_RESTORE_GATE_KEYS,
  encodeAsciiSortedCanonicalJson,
  type ExternalGate,
  type FinalRestoreGate,
  type PreflightGate,
  type RunnerRole,
  type ShadowOpenGate,
  type XrteethRestoreGate,
} from "@/services/task51/memoryRunnerProtocol";
import {
  createTask51MemoryRunnerBridge,
  type Task51RunnerSnapshot,
} from "@/services/task51/memoryRunnerBridge";
import MemoryIsolatedRunner from "@/views/internal/task51/MemoryIsolatedRunner.vue";

type RouteLeaveGuard = () => Promise<unknown>;

const routeLeave = vi.hoisted(() => ({
  guard: null as RouteLeaveGuard | null,
}));

vi.mock("vue-router", () => ({
  onBeforeRouteLeave: (guard: RouteLeaveGuard) => {
    routeLeave.guard = guard;
  },
}));

vi.mock("@/services/task51/memoryRunnerBridge", () => ({
  createTask51MemoryRunnerBridge: vi.fn(),
}));

const baseSnapshot = (
  overrides: Partial<Task51RunnerSnapshot> = {}
): Task51RunnerSnapshot =>
  ({
    state: "CAPTURE_USER",
    expectedRole: "user",
    capturedRoles: [],
    burnedCells: 0,
    totalCells: 56,
    ordinaryUserNegativePassed: null,
    rootBreakGlassPassed: null,
    tmrppReplayComplete: false,
    completed: false,
    cleared: false,
    failureCode: null,
    quietPeriodRemainingSeconds: 0,
    operationInFlight: false,
    finalEvidenceState: "NONE",
    finalEvidenceSha256: null,
    ...overrides,
  }) as Task51RunnerSnapshot;

function createBridgeHarness(initial: Task51RunnerSnapshot) {
  let current = initial;
  let subscriber: ((snapshot: Task51RunnerSnapshot) => void) | null = null;
  const unsubscribe = vi.fn();

  const bridge = {
    snapshot: vi.fn(() => current),
    subscribe: vi.fn((listener: (snapshot: Task51RunnerSnapshot) => void) => {
      subscriber = listener;
      listener(current);
      return unsubscribe;
    }),
    start: vi.fn(async () => undefined),
    confirmPreflight: vi.fn(
      async (
        _gate: PreflightGate,
        _binding: Uint8Array,
        _claimReceipt: Uint8Array
      ) => undefined
    ),
    captureFromInputs: vi.fn(
      async (
        _role: RunnerRole,
        _username: HTMLInputElement,
        _password: HTMLInputElement
      ) => undefined
    ),
    runBaseline: vi.fn(async (_gate: ExternalGate) => undefined),
    runXrteethShadowReplay: vi.fn(async (_gate: ShadowOpenGate) => undefined),
    confirmXrteethRestoredAndRunTmrpp: vi.fn(
      async (_restoreGate: XrteethRestoreGate, _openGate: ShadowOpenGate) =>
        undefined
    ),
    completeAfterFinalRestore: vi.fn(
      async (_gate: FinalRestoreGate) => undefined
    ),
    bindProductionDirectMatrixEvidence: vi.fn(async (_raw: Uint8Array) => true),
    consumeFinalEvidence: vi.fn(() => ({
      bytes: new TextEncoder().encode('{"testOnly":true}\n'),
      sha256: "a".repeat(64),
    })),
    abortForNavigation: vi.fn(async () => undefined),
    cleanup: vi.fn(async () => undefined),
  };

  vi.mocked(createTask51MemoryRunnerBridge).mockReturnValue(
    bridge as unknown as ReturnType<typeof createTask51MemoryRunnerBridge>
  );

  return {
    bridge,
    unsubscribe,
    async emit(overrides: Partial<Task51RunnerSnapshot>) {
      current = baseSnapshot({ ...current, ...overrides });
      subscriber?.(current);
      await nextTick();
    },
  };
}

type MountedView = {
  app: App<Element>;
  container: HTMLDivElement;
  active: boolean;
};

const mountedViews: MountedView[] = [];

async function mountView(initial: Task51RunnerSnapshot) {
  const harness = createBridgeHarness(initial);
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(MemoryIsolatedRunner);
  app.mount(container);
  const mounted = { app, container, active: true };
  mountedViews.push(mounted);
  await flushView();
  return { ...harness, mounted };
}

function unmountView(mounted: MountedView) {
  if (!mounted.active) return;
  mounted.active = false;
  mounted.app.unmount();
  mounted.container.remove();
}

async function flushView() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`missing button: ${label}`);
  }
  return button;
}

function externalActionLabels(container: HTMLElement): string[] {
  const known = new Set([
    "Run 24-cell baseline once",
    "Arm credential capture once",
    "Run xrteeth 12-cell replay once",
    "Acknowledge restore and run tmrpp once",
    "Clear captured references and complete",
  ]);
  return Array.from(container.querySelectorAll("button"))
    .map((button) => button.textContent?.trim() ?? "")
    .filter((label) => known.has(label));
}

function checkGate(checkbox: HTMLInputElement) {
  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
}

function currentStageBBindingRaw() {
  const now = Date.now();
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
    executionId: "task51-stage-b-view-test-execution",
    expiresAt: new Date(now + 40 * 60_000).toISOString(),
    issuedAt: new Date(now - 60_000).toISOString(),
    oneShot: true,
    productionDirectMatrixAuthorizedCellCount: 256,
    productionDirectMatrixEvidenceRef:
      "reports/task51-production-direct-matrix-test-fixture.json",
    productionDirectMatrixSchema: "wp3-task51-production-direct-matrix-v1",
    productionDirectMatrixSubjectDigest: "9".repeat(64),
    protocol: PROTOCOL,
    schema: STAGE_B_EXECUTION_EVIDENCE_SCHEMA,
    stageAApprovalRef: "WP3-REL-TASK51-MEMORY-RUNNER-STAGE-A-19700101",
    stageACoordinatorServerReleaseEvidenceSha256: "a".repeat(64),
    stageANetworkAttestorReleaseEvidenceSha256: "b".repeat(64),
    stageAReleaseEvidenceSha256: "c".repeat(64),
    status: "APPROVED",
  });
}

async function loadStageBBinding(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("missing Stage B binding input");
  }
  const raw = currentStageBBindingRaw();
  const file = {
    arrayBuffer: async () => raw.slice().buffer,
    size: raw.byteLength,
  } as File;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: { item: () => file, length: 1, 0: file },
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flushView();
  return raw;
}

function currentStageBClaimReceiptRaw(rawStageB: Uint8Array) {
  const stageB = JSON.parse(new TextDecoder().decode(rawStageB)) as Record<
    string,
    unknown
  >;
  return encodeAsciiSortedCanonicalJson({
    approvalRef: stageB.approvalRef,
    claimCount: 1,
    claimedAt: new Date(Date.now() - 30_000).toISOString(),
    coordinatorOrigin: stageB.coordinatorOrigin,
    coordinatorServerPublishSha: stageB.coordinatorServerPublishSha,
    executionId: stageB.executionId,
    expiresAt: stageB.expiresAt,
    globalExactOneClaimed: true,
    schema: STAGE_B_GLOBAL_CLAIM_RECEIPT_SCHEMA,
    stageBExecutionEvidenceSha256: "a".repeat(64),
    state: "CLAIMED",
  });
}

async function loadStageBClaimReceipt(
  container: HTMLElement,
  rawStageB: Uint8Array
) {
  const input = container.querySelectorAll('input[type="file"]')[1];
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("missing Stage B claim receipt input");
  }
  const raw = currentStageBClaimReceiptRaw(rawStageB);
  const file = {
    arrayBuffer: async () => raw.slice().buffer,
    size: raw.byteLength,
  } as File;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: { item: () => file, length: 1, 0: file },
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flushView();
  return raw;
}

async function loadProductionDirectMatrix(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("missing Production direct matrix input");
  }
  const raw = new TextEncoder().encode('{"testOnly":"matrix"}\n');
  const file = {
    arrayBuffer: async () => raw.slice().buffer,
    size: raw.byteLength,
  } as File;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: { item: () => file, length: 1, 0: file },
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flushView();
  return raw;
}

function allTrue(keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

function renderedGateKeys(container: HTMLElement, gateSet: string): string[] {
  return Array.from(
    container.querySelectorAll(`#task51-gates-${gateSet} li code`)
  ).map((element) => element.textContent?.trim() ?? "");
}

beforeEach(() => {
  routeLeave.guard = null;
  vi.mocked(createTask51MemoryRunnerBridge).mockReset();
});

afterEach(() => {
  for (const mounted of mountedViews.splice(0)) unmountView(mounted);
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MemoryIsolatedRunner", () => {
  it("mounts with zero owned network and no evidence action dispatch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, "open");
    const xhrSendSpy = vi.spyOn(XMLHttpRequest.prototype, "send");
    const { bridge, mounted } = await mountView(baseSnapshot());

    expect(
      mounted.container.querySelector("#task51-memory-runner")
    ).not.toBeNull();
    expect(mounted.container.textContent).toContain("baseline-only");
    expect(mounted.container.textContent).toContain("不是当前 Production 证据");
    expect(bridge.snapshot).toHaveBeenCalledOnce();
    expect(bridge.subscribe).toHaveBeenCalledOnce();
    expect(bridge.start).toHaveBeenCalledOnce();
    expect(bridge.captureFromInputs).not.toHaveBeenCalled();
    expect(bridge.confirmPreflight).not.toHaveBeenCalled();
    expect(bridge.runBaseline).not.toHaveBeenCalled();
    expect(bridge.runXrteethShadowReplay).not.toHaveBeenCalled();
    expect(bridge.confirmXrteethRestoredAndRunTmrpp).not.toHaveBeenCalled();
    expect(bridge.completeAfterFinalRestore).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(xhrSendSpy).not.toHaveBeenCalled();
  });

  it("passes native credential elements, clears them synchronously, and locks duplicate submit", async () => {
    const { bridge, mounted } = await mountView(baseSnapshot());
    let releaseCapture: (() => void) | null = null;
    bridge.captureFromInputs.mockImplementation(
      async (_role, username, password) => {
        username.value = "";
        password.value = "";
        await new Promise<void>((resolve) => {
          releaseCapture = resolve;
        });
      }
    );

    const form = mounted.container.querySelector("form");
    const username = mounted.container.querySelector('input[type="text"]');
    const password = mounted.container.querySelector('input[type="password"]');
    if (
      !(form instanceof HTMLFormElement) ||
      !(username instanceof HTMLInputElement) ||
      !(password instanceof HTMLInputElement)
    ) {
      throw new Error("missing native credential form");
    }

    username.value = "synthetic-user-not-pii";
    password.value = "synthetic-password-not-secret";
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await nextTick();

    expect(bridge.captureFromInputs).toHaveBeenCalledOnce();
    expect(bridge.captureFromInputs).toHaveBeenCalledWith(
      "user",
      username,
      password
    );
    expect(username.value).toBe("");
    expect(password.value).toBe("");
    expect(mounted.container.innerHTML).not.toContain("synthetic-user-not-pii");
    expect(mounted.container.innerHTML).not.toContain(
      "synthetic-password-not-secret"
    );

    releaseCapture?.();
    await flushView();
  });

  it("does not render or dispatch credentials before the quiet gate passes", async () => {
    const { bridge, mounted } = await mountView(
      baseSnapshot({ quietPeriodRemainingSeconds: 1 })
    );

    expect(mounted.container.querySelector("form")).toBeNull();
    expect(mounted.container.querySelector('input[type="text"]')).toBeNull();
    expect(
      mounted.container.querySelector('input[type="password"]')
    ).toBeNull();
    expect(bridge.captureFromInputs).not.toHaveBeenCalled();
  });

  it("keeps credential inputs absent until exact preflight confirmation", async () => {
    const { bridge, mounted } = await mountView(
      baseSnapshot({
        state: "PREFLIGHT",
        expectedRole: null,
        quietPeriodRemainingSeconds: 0,
      })
    );

    expect(mounted.container.querySelector("form")).toBeNull();
    expect(mounted.container.querySelector('input[type="text"]')).toBeNull();
    expect(
      mounted.container.querySelector('input[type="password"]')
    ).toBeNull();
    const button = findButton(mounted.container, "Arm credential capture once");
    expect(button.disabled).toBe(true);
    const checkbox = mounted.container.querySelector('input[type="checkbox"]');
    if (!(checkbox instanceof HTMLInputElement)) {
      throw new Error("missing preflight checkbox");
    }
    checkGate(checkbox);
    const rawStageB = await loadStageBBinding(mounted.container);
    await loadStageBClaimReceipt(mounted.container, rawStageB);
    await nextTick();
    expect(button.disabled).toBe(false);
    button.click();
    await flushView();

    expect(bridge.confirmPreflight).toHaveBeenCalledOnce();
    expect(bridge.confirmPreflight.mock.calls[0][0]).toEqual(
      allTrue(PREFLIGHT_GATE_KEYS)
    );
    expect(
      Object.prototype.toString.call(bridge.confirmPreflight.mock.calls[0][1])
    ).toBe("[object Uint8Array]");
    expect(
      Array.from(bridge.confirmPreflight.mock.calls[0][1]).every(
        (byte) => byte === 0
      )
    ).toBe(true);
    expect(
      Object.prototype.toString.call(bridge.confirmPreflight.mock.calls[0][2])
    ).toBe("[object Uint8Array]");
    expect(
      Array.from(bridge.confirmPreflight.mock.calls[0][2]).every(
        (byte) => byte === 0
      )
    ).toBe(true);
    expect(bridge.captureFromInputs).not.toHaveBeenCalled();
  });

  it("rejects an oversized Stage B file before reading its bytes", async () => {
    const { bridge, mounted } = await mountView(
      baseSnapshot({
        state: "PREFLIGHT",
        expectedRole: null,
        quietPeriodRemainingSeconds: 0,
      })
    );
    const input = mounted.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("missing Stage B binding input");
    }
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(0));
    const file = {
      arrayBuffer,
      size: STAGE_B_EXECUTION_EVIDENCE_MAX_BYTES + 1,
    } as File;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: { item: () => file, length: 1, 0: file },
    });

    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flushView();

    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(mounted.container.textContent).toContain(
      "Stage B execution evidence was rejected"
    );
    expect(bridge.confirmPreflight).not.toHaveBeenCalled();
  });

  it("rejects an oversized global claim receipt before reading its bytes", async () => {
    const { bridge, mounted } = await mountView(
      baseSnapshot({
        state: "PREFLIGHT",
        expectedRole: null,
        quietPeriodRemainingSeconds: 0,
      })
    );
    const input = mounted.container.querySelectorAll('input[type="file"]')[1];
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("missing Stage B claim receipt input");
    }
    const arrayBuffer = vi.fn(async () => new ArrayBuffer(0));
    const file = {
      arrayBuffer,
      size: STAGE_B_GLOBAL_CLAIM_RECEIPT_MAX_BYTES + 1,
    } as File;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: { item: () => file, length: 1, 0: file },
    });

    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flushView();

    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(mounted.container.textContent).toContain(
      "global Stage B claim receipt was rejected"
    );
    expect(bridge.confirmPreflight).not.toHaveBeenCalled();
  });

  it("derives capture roles only from the fixed snapshot order", async () => {
    const { bridge, emit, mounted } = await mountView(baseSnapshot());
    bridge.captureFromInputs.mockImplementation(
      async (_role, username, password) => {
        username.value = "";
        password.value = "";
      }
    );

    const sequence: Array<{
      state: Task51RunnerSnapshot["state"];
      role: RunnerRole;
      capturedRoles: RunnerRole[];
    }> = [
      { state: "CAPTURE_USER", role: "user", capturedRoles: [] },
      {
        state: "CAPTURE_MANAGER",
        role: "manager",
        capturedRoles: ["user"],
      },
      {
        state: "CAPTURE_ADMIN",
        role: "admin",
        capturedRoles: ["user", "manager"],
      },
      {
        state: "CAPTURE_ROOT",
        role: "root",
        capturedRoles: ["user", "manager", "admin"],
      },
    ];

    for (const step of sequence) {
      await emit({
        state: step.state,
        expectedRole: step.role,
        capturedRoles: step.capturedRoles,
      });
      const username = mounted.container.querySelector('input[type="text"]');
      const password = mounted.container.querySelector(
        'input[type="password"]'
      );
      const form = mounted.container.querySelector("form");
      if (
        !(username instanceof HTMLInputElement) ||
        !(password instanceof HTMLInputElement) ||
        !(form instanceof HTMLFormElement)
      ) {
        throw new Error("missing role capture form");
      }
      username.value = `synthetic-${step.role}`;
      password.value = "synthetic-password";
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
      await flushView();
    }

    expect(bridge.captureFromInputs.mock.calls.map(([role]) => role)).toEqual([
      "user",
      "manager",
      "admin",
      "root",
    ]);
  });

  it.each([
    {
      state: "PREFLIGHT",
      label: "Arm credential capture once",
      checkboxCount: 1,
      action: "preflight",
      gateSets: [{ name: "preflight", keys: PREFLIGHT_GATE_KEYS }],
    },
    {
      state: "READINESS_VERIFIED",
      label: "Run 24-cell baseline once",
      checkboxCount: 1,
      action: "baseline",
      gateSets: [{ name: "baseline", keys: EXTERNAL_GATE_KEYS }],
    },
    {
      state: "BASELINE_READY",
      label: "Run xrteeth 12-cell replay once",
      checkboxCount: 1,
      action: "xrteeth",
      gateSets: [{ name: "shadow-open", keys: SHADOW_OPEN_GATE_KEYS }],
    },
    {
      state: "WAIT_XRTEETH_RESTORED",
      label: "Acknowledge restore and run tmrpp once",
      checkboxCount: 2,
      action: "tmrpp",
      gateSets: [
        { name: "xrteeth-restore", keys: XRTEETH_RESTORE_GATE_KEYS },
        { name: "tmrpp-open", keys: SHADOW_OPEN_GATE_KEYS },
      ],
    },
    {
      state: "TMRPP_SHADOW_RUNNING",
      label: "Clear captured references and complete",
      checkboxCount: 1,
      action: "complete",
      gateSets: [{ name: "final-restore", keys: FINAL_RESTORE_GATE_KEYS }],
    },
  ] as const)(
    "shows and dispatches only the $state external gate",
    async ({ state, label, checkboxCount, action, gateSets }) => {
      const { bridge, emit, mounted } = await mountView(
        baseSnapshot({
          state,
          expectedRole: null,
          capturedRoles: ["user", "manager", "admin", "root"],
          tmrppReplayComplete: state === "TMRPP_SHADOW_RUNNING",
        })
      );

      expect(externalActionLabels(mounted.container)).toEqual([label]);
      const button = findButton(mounted.container, label);
      const checkboxes = Array.from(
        mounted.container.querySelectorAll('input[type="checkbox"]')
      );
      expect(checkboxes).toHaveLength(checkboxCount);
      expect(mounted.container.querySelectorAll("ul.gate-list")).toHaveLength(
        gateSets.length
      );
      expect(
        mounted.container.querySelectorAll("ul.gate-list li")
      ).toHaveLength(
        gateSets.reduce((total, gateSet) => total + gateSet.keys.length, 0)
      );
      for (const gateSet of gateSets) {
        const keys = renderedGateKeys(mounted.container, gateSet.name);
        expect(keys).toEqual([...gateSet.keys]);
        expect(new Set(keys).size).toBe(gateSet.keys.length);
        for (const key of keys) {
          const item = Array.from(
            mounted.container.querySelectorAll(
              `#task51-gates-${gateSet.name} li`
            )
          ).find(
            (candidate) =>
              candidate.querySelector("code")?.textContent?.trim() === key
          );
          expect(item?.querySelector("span")?.textContent?.trim()).toBeTruthy();
        }
      }
      expect(
        Array.from(mounted.container.querySelectorAll("label.gate")).every(
          (labelElement) =>
            labelElement.textContent?.includes("execution latch only") &&
            labelElement.textContent.includes("not Production evidence")
        )
      ).toBe(true);
      expect(button.disabled).toBe(true);
      for (const checkbox of checkboxes) {
        if (!(checkbox instanceof HTMLInputElement)) {
          throw new Error("invalid gate checkbox");
        }
        checkGate(checkbox);
      }
      if (action === "preflight") {
        const rawStageB = await loadStageBBinding(mounted.container);
        await loadStageBClaimReceipt(mounted.container, rawStageB);
      } else if (action === "complete") {
        expect(button.disabled).toBe(true);
        await loadProductionDirectMatrix(mounted.container);
        expect(
          bridge.bindProductionDirectMatrixEvidence
        ).toHaveBeenCalledOnce();
      }
      await nextTick();
      expect(button.disabled).toBe(false);

      await emit({ operationInFlight: true });
      expect(findButton(mounted.container, label).disabled).toBe(true);
      await emit({ operationInFlight: false });
      findButton(mounted.container, label).click();
      await flushView();

      const totalDispatches =
        bridge.confirmPreflight.mock.calls.length +
        bridge.runBaseline.mock.calls.length +
        bridge.runXrteethShadowReplay.mock.calls.length +
        bridge.confirmXrteethRestoredAndRunTmrpp.mock.calls.length +
        bridge.completeAfterFinalRestore.mock.calls.length;
      expect(totalDispatches).toBe(1);

      if (action === "preflight") {
        expect(bridge.confirmPreflight.mock.calls[0][0]).toEqual(
          allTrue(PREFLIGHT_GATE_KEYS)
        );
        expect(
          Object.prototype.toString.call(
            bridge.confirmPreflight.mock.calls[0][1]
          )
        ).toBe("[object Uint8Array]");
        expect(
          Object.prototype.toString.call(
            bridge.confirmPreflight.mock.calls[0][2]
          )
        ).toBe("[object Uint8Array]");
      } else if (action === "baseline") {
        expect(bridge.runBaseline).toHaveBeenCalledWith(
          allTrue(EXTERNAL_GATE_KEYS)
        );
      } else if (action === "xrteeth") {
        expect(bridge.runXrteethShadowReplay).toHaveBeenCalledWith(
          allTrue(SHADOW_OPEN_GATE_KEYS)
        );
      } else if (action === "tmrpp") {
        expect(bridge.confirmXrteethRestoredAndRunTmrpp).toHaveBeenCalledWith(
          allTrue(XRTEETH_RESTORE_GATE_KEYS),
          allTrue(SHADOW_OPEN_GATE_KEYS)
        );
      } else {
        expect(bridge.completeAfterFinalRestore).toHaveBeenCalledWith(
          allTrue(FINAL_RESTORE_GATE_KEYS)
        );
      }
    }
  );

  it("keeps final completion disabled when the Production matrix is absent or rejected", async () => {
    const { bridge, mounted } = await mountView(
      baseSnapshot({
        state: "TMRPP_SHADOW_RUNNING",
        expectedRole: null,
        capturedRoles: ["user", "manager", "admin", "root"],
        tmrppReplayComplete: true,
      })
    );
    const button = findButton(
      mounted.container,
      "Clear captured references and complete"
    );
    const checkbox = mounted.container.querySelector('input[type="checkbox"]');
    if (!(checkbox instanceof HTMLInputElement)) {
      throw new Error("missing final-restore checkbox");
    }
    checkGate(checkbox);
    await nextTick();
    expect(button.disabled).toBe(true);

    bridge.bindProductionDirectMatrixEvidence.mockResolvedValueOnce(false);
    await loadProductionDirectMatrix(mounted.container);

    expect(button.disabled).toBe(true);
    expect(mounted.container.textContent).toContain(
      "The direct matrix was rejected"
    );
    button.click();
    await flushView();
    expect(bridge.completeAfterFinalRestore).not.toHaveBeenCalled();
  });

  it("renders only safe summaries and never expands raw cell material", async () => {
    const unsafeRuntimeCell = {
      ledgerKey: "baseline:xrteeth:user:/v1/user/info",
      phase: "baseline",
      node: "xrteeth",
      role: "user",
      path: "/v1/user/info",
      httpStatus: 200,
      transportPassed: true,
      schemaPassed: true,
      expectedDecisionMatched: true,
      bearer: "Bearer synthetic-bearer-sentinel",
      rawResponse: "synthetic-raw-response-sentinel",
      digest: "synthetic-digest-sentinel",
      email: "synthetic-pii@example.invalid",
      subject: "synthetic-subject-sentinel",
    };
    const unsafeExtendedSnapshot = {
      ...baseSnapshot({
        state: "BASELINE_READY",
        expectedRole: null,
        burnedCells: 32,
        ordinaryUserNegativePassed: true,
        rootBreakGlassPassed: true,
        failureCode: "NETWORK_ERROR",
      }),
      cells: [unsafeRuntimeCell],
    } as Task51RunnerSnapshot;
    const { mounted } = await mountView(unsafeExtendedSnapshot);

    const rendered = mounted.container.textContent ?? "";
    expect(rendered).toContain("NETWORK_ERROR");
    expect(rendered).not.toContain("Safe cell records held in the page");
    for (const forbidden of [
      "synthetic-bearer-sentinel",
      "synthetic-raw-response-sentinel",
      "synthetic-digest-sentinel",
      "synthetic-pii@example.invalid",
      "synthetic-subject-sentinel",
    ]) {
      expect(rendered).not.toContain(forbidden);
      expect(mounted.container.innerHTML).not.toContain(forbidden);
    }
  });

  it("aborts on route leave and unsubscribes and cleans up on unmount", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { bridge, unsubscribe, mounted } = await mountView(baseSnapshot());
    expect(routeLeave.guard).not.toBeNull();

    const result = await routeLeave.guard?.();
    expect(result).toBe(true);
    expect(bridge.abortForNavigation).toHaveBeenCalledOnce();
    expect(bridge.cleanup).not.toHaveBeenCalled();

    unmountView(mounted);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(bridge.cleanup).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("exports READY evidence once through the native picker without a Blob URL", async () => {
    const fragmentBytes = new TextEncoder().encode(
      '{"schema":"wp3-task51-runner-fragment-v3"}\n'
    );
    let writtenBytes: Uint8Array | null = null;
    const write = vi.fn(async (bytes: Uint8Array) => {
      writtenBytes = bytes.slice();
    });
    const close = vi.fn(async () => undefined);
    const picker = vi.fn(async () => ({
      createWritable: async () => ({ write, close }),
    }));
    vi.stubGlobal("showSaveFilePicker", picker);
    const { bridge, mounted } = await mountView(
      baseSnapshot({
        state: "CLEARED",
        expectedRole: null,
        burnedCells: 56,
        completed: true,
        cleared: true,
        finalEvidenceState: "READY",
        finalEvidenceSha256: "b".repeat(64),
      })
    );
    bridge.consumeFinalEvidence.mockReturnValue({
      bytes: fragmentBytes.slice(),
      sha256: "b".repeat(64),
    });

    const button = findButton(
      mounted.container,
      "Export canonical fragment once"
    );
    button.click();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());

    expect(picker).toHaveBeenCalledOnce();
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: "wp3-task51-runner-fragment-v3.json",
      })
    );
    expect(bridge.consumeFinalEvidence).toHaveBeenCalledOnce();
    expect(writtenBytes).toEqual(fragmentBytes);
    expect(
      Array.from(mounted.container.querySelectorAll("button")).some(
        (candidate) =>
          candidate.textContent?.trim() === "Export canonical fragment once"
      )
    ).toBe(false);
    expect(mounted.container.textContent).toContain("b".repeat(64));
    expect(mounted.container.innerHTML).not.toContain("blob:");
  });

  it("zeroizes the native export buffer when unmount interrupts a pending write", async () => {
    const exportedBytes = new TextEncoder().encode(
      '{"schema":"wp3-task51-runner-fragment-v3"}\n'
    );
    let releaseWrite = () => undefined;
    const pendingWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const write = vi.fn(async (_bytes: Uint8Array) => pendingWrite);
    const close = vi.fn(async () => undefined);
    vi.stubGlobal(
      "showSaveFilePicker",
      vi.fn(async () => ({
        createWritable: async () => ({ write, close }),
      }))
    );
    const { bridge, mounted } = await mountView(
      baseSnapshot({
        state: "CLEARED",
        expectedRole: null,
        burnedCells: 56,
        completed: true,
        cleared: true,
        finalEvidenceState: "READY",
        finalEvidenceSha256: "b".repeat(64),
      })
    );
    bridge.consumeFinalEvidence.mockReturnValue({
      bytes: exportedBytes,
      sha256: "b".repeat(64),
    });

    findButton(mounted.container, "Export canonical fragment once").click();
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce());
    unmountView(mounted);

    expect(Array.from(exportedBytes).every((byte) => byte === 0)).toBe(true);
    expect(Array.from(write.mock.calls[0][0]).every((byte) => byte === 0)).toBe(
      true
    );
    expect(bridge.abortForNavigation).toHaveBeenCalledOnce();
    expect(bridge.cleanup).toHaveBeenCalledOnce();
    releaseWrite();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  });

  it("keeps CLEARED terminal with no capture, external gate, retry, or reset", async () => {
    const { bridge, emit, mounted } = await mountView(baseSnapshot());
    await emit({
      state: "CLEARED",
      expectedRole: null,
      capturedRoles: ["user", "manager", "admin", "root"],
      burnedCells: 56,
      completed: true,
      cleared: true,
      operationInFlight: false,
    });

    expect(mounted.container.querySelector("form")).toBeNull();
    expect(externalActionLabels(mounted.container)).toEqual([]);
    expect(mounted.container.querySelectorAll("button")).toHaveLength(0);
    expect(mounted.container.textContent).not.toMatch(/retry|reset/i);
    expect(bridge.captureFromInputs).not.toHaveBeenCalled();
    expect(bridge.confirmPreflight).not.toHaveBeenCalled();
    expect(bridge.runBaseline).not.toHaveBeenCalled();
    expect(bridge.runXrteethShadowReplay).not.toHaveBeenCalled();
    expect(bridge.confirmXrteethRestoredAndRunTmrpp).not.toHaveBeenCalled();
    expect(bridge.completeAfterFinalRestore).not.toHaveBeenCalled();
  });
});
