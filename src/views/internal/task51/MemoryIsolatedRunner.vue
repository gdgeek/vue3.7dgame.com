<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { onBeforeRouteLeave } from "vue-router";

import {
  PRODUCTION_DIRECT_MATRIX_MAX_BYTES,
  STAGE_B_EXECUTION_EVIDENCE_MAX_BYTES,
  STAGE_B_GLOBAL_CLAIM_RECEIPT_MAX_BYTES,
  type ExternalGate,
  type ExternalGateKey,
  type FinalRestoreGate,
  type FinalRestoreGateKey,
  type PreflightGate,
  type PreflightGateKey,
  type RunnerRole,
  type ShadowOpenGate,
  type ShadowOpenGateKey,
  type XrteethRestoreGate,
  type XrteethRestoreGateKey,
  parseStageBExecutionEvidence,
} from "@/services/task51/memoryRunnerProtocol";
import {
  createTask51MemoryRunnerBridge,
  type Task51RunnerSnapshot,
} from "@/services/task51/memoryRunnerBridge";

const bridge = createTask51MemoryRunnerBridge();
const snapshot = ref<Task51RunnerSnapshot>(bridge.snapshot());
const usernameInput = ref<HTMLInputElement | null>(null);
const passwordInput = ref<HTMLInputElement | null>(null);
const stageBArtifactInput = ref<HTMLInputElement | null>(null);
const stageBClaimArtifactInput = ref<HTMLInputElement | null>(null);
const productionDirectMatrixInput = ref<HTMLInputElement | null>(null);
const stageBBindingBytes = shallowRef<Uint8Array | null>(null);
const stageBClaimReceiptBytes = shallowRef<Uint8Array | null>(null);
const stageBBindingRejected = ref(false);
const stageBClaimReceiptRejected = ref(false);
const productionDirectMatrixBound = ref(false);
const productionDirectMatrixRejected = ref(false);
const actionBusy = ref(false);
const capturePreflightAcknowledged = ref(false);
const baselineAcknowledged = ref(false);
const xrteethOpenAcknowledged = ref(false);
const xrteethRestoreAcknowledged = ref(false);
const tmrppOpenAcknowledged = ref(false);
const finalRestoreAcknowledged = ref(false);
const finalExportAttempted = ref(false);
const finalExportFailed = ref(false);
const exportedSha256 = ref<string | null>(null);
let unsubscribe: (() => void) | null = null;
let activeExportBytes: Uint8Array | null = null;

type NativeWritable = {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
};

type NativeSaveHandle = {
  createWritable(): Promise<NativeWritable>;
};

type NativeSavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: ReadonlyArray<{
      description: string;
      accept: Readonly<Record<string, readonly string[]>>;
    }>;
  }) => Promise<NativeSaveHandle>;
};

const roleLabel = computed(() => snapshot.value.expectedRole ?? "none");
const canCapture = computed(
  () =>
    snapshot.value.expectedRole !== null &&
    snapshot.value.quietPeriodRemainingSeconds === 0 &&
    !snapshot.value.operationInFlight &&
    !actionBusy.value
);

const EXTERNAL_GATE_LABELS = {
  exactProductionOrigin: "The Production origin is exact.",
  operatorRootVerified:
    "A fresh operator user-info response verifies the root primary role.",
  warmSpaDocument: "This is the approved warm SPA document.",
  operatorAuthQuietPeriodComplete:
    "The required operator authentication quiet period is complete.",
  evidenceFenceQuiet:
    "The evidence fence reports no unexpected API, storage, auth, or plugin traffic.",
  exclusiveLockAcquired: "The exclusive runner lock is acquired.",
  serviceWorkerAbsent: "No service worker controls or races this runner.",
  task33bEvidenceInherited:
    "The approved Task 3.3b direct 4x8 evidence is inherited as baseline-only evidence, never as current-Production evidence.",
  task41ArtifactExact: "The Task 4.1 artifact identity is exact.",
  xrteethCorsExact: "xrteeth CORS source and runtime evidence is exact.",
  tmrppCorsExact: "tmrpp CORS source and runtime evidence is exact.",
  xrteethFullDefaultOff: "xrteeth is freshly verified full-default-off.",
  tmrppFullDefaultOff: "tmrpp is freshly verified full-default-off.",
  xrteethRevisionHealthyExact: "xrteeth revision and target health are exact.",
  tmrppRevisionHealthyExact: "tmrpp revision and target health are exact.",
  noCompetingWriter: "No competing writer exists.",
} as const satisfies Readonly<Record<ExternalGateKey, string>>;

const PREFLIGHT_GATE_LABELS = {
  ...EXTERNAL_GATE_LABELS,
  stageAWebReleasePassedExact:
    "The exact Stage A web release and every required live consumer are converged.",
  stageBOneShotApprovalExact:
    "The exact Stage B one-shot approval is independently issued and bound.",
  stageBWindowCurrent: "The approved Stage B execution window is current.",
  stageBGlobalClaimExact:
    "The authoritative coordinator receipt proves this Stage B execution was claimed exactly once.",
} as const satisfies Readonly<Record<PreflightGateKey, string>>;

const SHADOW_OPEN_GATE_LABELS = {
  identityShadowExact: "Identity shadow source and runtime are exact.",
  backendRouteEnabledAfterIdentityShadow:
    "The Backend route was enabled only after Identity shadow.",
  roleWriteDefaultOff: "Role-write remains full-default-off.",
  organizationDefaultOff: "Organization remains full-default-off.",
  exactRevisionHealthy: "The target revision and health are exact.",
  noCompetingWriter: "No competing writer exists.",
  unexpectedTrafficZero: "Unexpected traffic remains zero.",
} as const satisfies Readonly<Record<ShadowOpenGateKey, string>>;

const XRTEETH_RESTORE_GATE_LABELS = {
  backendRouteRestoredBeforeIdentityLegacy:
    "The xrteeth Backend route was restored before Identity legacy.",
  identityLegacyRestored: "xrteeth Identity legacy mode is restored.",
  authzFullDefaultOff: "xrteeth AuthZ is full-default-off.",
  roleWriteDefaultOff: "xrteeth role-write remains full-default-off.",
  organizationDefaultOff: "xrteeth organization remains full-default-off.",
  exactRevisionHealthy: "The xrteeth revision and health are exact.",
  nodeLocalCompletedPositive:
    "The xrteeth node-local completed count is positive.",
  nodeLocalMismatchZero: "The xrteeth node-local mismatch count is zero.",
  nodeLocalErrorZero: "The xrteeth node-local error count is zero.",
  nodeLocalFallbackZero: "The xrteeth node-local fallback count is zero.",
  nodeLocalPermissionUnionZero:
    "The xrteeth node-local permission-union count is zero.",
  nodeLocalWriteZero: "The xrteeth node-local write count is zero.",
  unexpectedTrafficZero: "Unexpected traffic remains zero.",
} as const satisfies Readonly<Record<XrteethRestoreGateKey, string>>;

const FINAL_RESTORE_GATE_LABELS = {
  tmrppBackendRestoredBeforeIdentityLegacy:
    "The tmrpp Backend route was restored before Identity legacy.",
  tmrppIdentityLegacyRestored: "tmrpp Identity legacy mode is restored.",
  tmrppNodeLocalCompletedPositive:
    "The tmrpp node-local completed count is positive.",
  tmrppNodeLocalMismatchZero: "The tmrpp node-local mismatch count is zero.",
  tmrppNodeLocalErrorZero: "The tmrpp node-local error count is zero.",
  tmrppNodeLocalFallbackZero: "The tmrpp node-local fallback count is zero.",
  tmrppNodeLocalPermissionUnionZero:
    "The tmrpp node-local permission-union count is zero.",
  tmrppNodeLocalWriteZero: "The tmrpp node-local write count is zero.",
  dualNodeAuthzFullDefaultOff: "Dual-node AuthZ is full-default-off.",
  dualNodeRoleWriteDefaultOff: "Dual-node role-write is full-default-off.",
  dualNodeOrganizationDefaultOff: "Dual-node organization is full-default-off.",
  dualNodeExactRevisionsHealthy:
    "Dual-node revisions and target health are exact.",
  defaultOffCycleOnePassed: "Default-off verification cycle one passed.",
  defaultOffCycleTwoPassed: "Default-off verification cycle two passed.",
  unexpectedTrafficZero: "Unexpected traffic remains zero.",
} as const satisfies Readonly<Record<FinalRestoreGateKey, string>>;

function labelEntries<Key extends string>(
  labels: Readonly<Record<Key, string>>
): ReadonlyArray<readonly [Key, string]> {
  return Object.entries(labels) as Array<[Key, string]>;
}

function acknowledgedGateFromLabels<Key extends string>(
  labels: Readonly<Record<Key, string>>
): Readonly<Record<Key, boolean>> {
  return Object.fromEntries(
    (Object.keys(labels) as Key[]).map((key) => [key, true])
  ) as Readonly<Record<Key, boolean>>;
}

const preflightGateLabels = labelEntries(PREFLIGHT_GATE_LABELS);
const externalGateLabels = labelEntries(EXTERNAL_GATE_LABELS);
const shadowOpenGateLabels = labelEntries(SHADOW_OPEN_GATE_LABELS);
const xrteethRestoreGateLabels = labelEntries(XRTEETH_RESTORE_GATE_LABELS);
const finalRestoreGateLabels = labelEntries(FINAL_RESTORE_GATE_LABELS);

const buildPreflightGate = (): PreflightGate =>
  acknowledgedGateFromLabels(PREFLIGHT_GATE_LABELS);
const buildExternalGate = (): ExternalGate =>
  acknowledgedGateFromLabels(EXTERNAL_GATE_LABELS);
const buildShadowOpenGate = (): ShadowOpenGate =>
  acknowledgedGateFromLabels(SHADOW_OPEN_GATE_LABELS);
const buildXrteethRestoreGate = (): XrteethRestoreGate =>
  acknowledgedGateFromLabels(XRTEETH_RESTORE_GATE_LABELS);
const buildFinalRestoreGate = (): FinalRestoreGate =>
  acknowledgedGateFromLabels(FINAL_RESTORE_GATE_LABELS);

function clearStageBClaimReceiptBytes() {
  stageBClaimReceiptBytes.value?.fill(0);
  stageBClaimReceiptBytes.value = null;
  stageBClaimReceiptRejected.value = false;
  if (stageBClaimArtifactInput.value) {
    stageBClaimArtifactInput.value.value = "";
  }
}

function clearStageBBindingBytes() {
  stageBBindingBytes.value?.fill(0);
  stageBBindingBytes.value = null;
  if (stageBArtifactInput.value) stageBArtifactInput.value.value = "";
  clearStageBClaimReceiptBytes();
}

async function loadStageBBinding(event: Event) {
  clearStageBBindingBytes();
  stageBBindingRejected.value = false;
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.item(0);
  if (!file) return;
  if (
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > STAGE_B_EXECUTION_EVIDENCE_MAX_BYTES
  ) {
    stageBBindingRejected.value = true;
    input.value = "";
    return;
  }
  let bytes: Uint8Array | null = null;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
    parseStageBExecutionEvidence(bytes, Date.now());
    stageBBindingBytes.value = bytes;
    bytes = null;
  } catch {
    bytes?.fill(0);
    stageBBindingRejected.value = true;
  } finally {
    input.value = "";
  }
}

async function loadStageBClaimReceipt(event: Event) {
  clearStageBClaimReceiptBytes();
  stageBClaimReceiptRejected.value = false;
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.item(0);
  if (!file) return;
  if (
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > STAGE_B_GLOBAL_CLAIM_RECEIPT_MAX_BYTES
  ) {
    stageBClaimReceiptRejected.value = true;
    input.value = "";
    return;
  }
  let bytes: Uint8Array | null = null;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength !== file.size || bytes.byteLength === 0) {
      throw new Error("TASK51_STAGE_B_GLOBAL_CLAIM_RECEIPT_REJECTED");
    }
    stageBClaimReceiptBytes.value = bytes;
    bytes = null;
  } catch {
    bytes?.fill(0);
    stageBClaimReceiptRejected.value = true;
  } finally {
    input.value = "";
  }
}

async function captureCurrentRole() {
  if (!canCapture.value) return;
  const role = snapshot.value.expectedRole;
  const usernameElement = usernameInput.value;
  const passwordElement = passwordInput.value;
  if (!role || !usernameElement || !passwordElement) return;

  actionBusy.value = true;
  try {
    await bridge.captureFromInputs(
      role as RunnerRole,
      usernameElement,
      passwordElement
    );
  } finally {
    // Only DOM element references cross this await. The bridge reads and clears
    // both credential strings after its final Service Worker re-check.
    actionBusy.value = false;
  }
}

async function confirmCredentialPreflight() {
  const rawBinding = stageBBindingBytes.value;
  const rawClaimReceipt = stageBClaimReceiptBytes.value;
  if (
    !capturePreflightAcknowledged.value ||
    !rawBinding ||
    !rawClaimReceipt ||
    snapshot.value.quietPeriodRemainingSeconds !== 0 ||
    snapshot.value.operationInFlight ||
    actionBusy.value
  ) {
    return;
  }
  stageBBindingBytes.value = null;
  stageBClaimReceiptBytes.value = null;
  actionBusy.value = true;
  try {
    await bridge.confirmPreflight(
      buildPreflightGate(),
      rawBinding,
      rawClaimReceipt
    );
  } finally {
    rawBinding.fill(0);
    rawClaimReceipt.fill(0);
    actionBusy.value = false;
  }
}

async function runBaseline() {
  if (!baselineAcknowledged.value || actionBusy.value) return;
  actionBusy.value = true;
  try {
    await bridge.runBaseline(buildExternalGate());
  } finally {
    actionBusy.value = false;
  }
}

async function runXrteethShadow() {
  if (!xrteethOpenAcknowledged.value || actionBusy.value) return;
  actionBusy.value = true;
  try {
    await bridge.runXrteethShadowReplay(buildShadowOpenGate());
  } finally {
    actionBusy.value = false;
  }
}

async function restoreXrteethAndRunTmrpp() {
  if (
    !xrteethRestoreAcknowledged.value ||
    !tmrppOpenAcknowledged.value ||
    actionBusy.value
  ) {
    return;
  }
  actionBusy.value = true;
  try {
    await bridge.confirmXrteethRestoredAndRunTmrpp(
      buildXrteethRestoreGate(),
      buildShadowOpenGate()
    );
  } finally {
    actionBusy.value = false;
  }
}

async function finishAfterFinalRestore() {
  if (
    !finalRestoreAcknowledged.value ||
    !productionDirectMatrixBound.value ||
    actionBusy.value
  )
    return;
  actionBusy.value = true;
  try {
    await bridge.completeAfterFinalRestore(buildFinalRestoreGate());
  } finally {
    actionBusy.value = false;
  }
}

async function loadProductionDirectMatrix(event: Event) {
  productionDirectMatrixRejected.value = false;
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.item(0);
  if (!file) return;
  if (
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > PRODUCTION_DIRECT_MATRIX_MAX_BYTES ||
    productionDirectMatrixBound.value ||
    actionBusy.value
  ) {
    productionDirectMatrixRejected.value = true;
    input.value = "";
    return;
  }
  let bytes: Uint8Array | null = null;
  actionBusy.value = true;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
    productionDirectMatrixBound.value =
      await bridge.bindProductionDirectMatrixEvidence(bytes);
    bytes = null;
    productionDirectMatrixRejected.value = !productionDirectMatrixBound.value;
  } catch {
    bytes?.fill(0);
    productionDirectMatrixRejected.value = true;
  } finally {
    input.value = "";
    actionBusy.value = false;
  }
}

async function exportFinalEvidence() {
  if (
    finalExportAttempted.value ||
    actionBusy.value ||
    snapshot.value.state !== "CLEARED" ||
    snapshot.value.finalEvidenceState !== "READY"
  ) {
    return;
  }
  finalExportFailed.value = false;
  const picker = (window as NativeSavePickerWindow).showSaveFilePicker;
  if (!picker) {
    finalExportFailed.value = true;
    return;
  }

  actionBusy.value = true;
  let writable: NativeWritable | null = null;
  let bytes: Uint8Array | null = null;
  try {
    const handle = await picker({
      suggestedName: "wp3-task51-runner-fragment-v3.json",
      types: [
        {
          description: "Task 5.1 canonical runner fragment",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    writable = await handle.createWritable();
    const evidence = bridge.consumeFinalEvidence();
    finalExportAttempted.value = true;
    bytes = evidence.bytes;
    activeExportBytes = bytes;
    await writable.write(bytes);
    await writable.close();
    writable = null;
    exportedSha256.value = evidence.sha256;
  } catch {
    finalExportFailed.value = true;
    await writable?.abort?.().catch(() => undefined);
  } finally {
    bytes?.fill(0);
    activeExportBytes = null;
    actionBusy.value = false;
  }
}

onMounted(async () => {
  unsubscribe = bridge.subscribe((next) => {
    snapshot.value = next;
  });
  await bridge.start();
});

onBeforeRouteLeave(async () => {
  activeExportBytes?.fill(0);
  activeExportBytes = null;
  clearStageBBindingBytes();
  await bridge.abortForNavigation();
  return true;
});

onBeforeUnmount(() => {
  activeExportBytes?.fill(0);
  activeExportBytes = null;
  clearStageBBindingBytes();
  unsubscribe?.();
  unsubscribe = null;
  void bridge.abortForNavigation();
  void bridge.cleanup();
});
</script>

<template>
  <main id="task51-memory-runner" class="task51-runner">
    <header>
      <p class="eyebrow">WP3 · Task 5.1</p>
      <h1>Memory-isolated evidence runner</h1>
      <p>
        Task 3.3b 的直接 4×8 UI/plugin 证据在本轮是 baseline-only inherited
        evidence，不是当前 Production 证据。 本页执行固定双节点三接口
        baseline/shadow parity，并在封口前绑定 当前 Production 双节点四阶段 4×8
        直接矩阵的规范化证据。
      </p>
    </header>

    <section class="status-grid" aria-label="Runner safe status">
      <div>
        <span>State</span><strong>{{ snapshot.state }}</strong>
      </div>
      <div>
        <span>Expected role</span><strong>{{ roleLabel }}</strong>
      </div>
      <div>
        <span>Captured roles</span>
        <strong>{{ snapshot.capturedRoles.length }}/4</strong>
      </div>
      <div>
        <span>Evidence cells</span>
        <strong>{{ snapshot.burnedCells }}/{{ snapshot.totalCells }}</strong>
      </div>
    </section>

    <section v-if="snapshot.state === 'PREFLIGHT'" class="panel">
      <h2>Credential preflight</h2>
      <p v-if="snapshot.quietPeriodRemainingSeconds > 0" class="notice">
        Operator auth quiet gate: {{ snapshot.quietPeriodRemainingSeconds }}s
        remaining. Credential inputs do not exist until this reaches zero and
        every gate below is acknowledged.
      </p>
      <ul
        id="task51-gates-preflight"
        class="gate-list"
        aria-label="Credential preflight exact gates"
      >
        <li v-for="[key, label] in preflightGateLabels" :key="key">
          <code>{{ key }}</code>
          <span>{{ label }}</span>
        </li>
      </ul>
      <label>
        Exact Stage B execution evidence (canonical JSON)
        <input
          ref="stageBArtifactInput"
          type="file"
          accept="application/json,.json"
          @change="loadStageBBinding"
        />
      </label>
      <p v-if="stageBBindingBytes" class="notice">
        Exact current-window artifact loaded in volatile memory. It will be
        hashed and erased when capture is armed.
      </p>
      <p v-if="stageBBindingRejected" class="notice">
        Stage B execution evidence was rejected. Load the exact canonical,
        current-window artifact.
      </p>
      <label>
        Global Stage B claim receipt (canonical JSON)
        <input
          ref="stageBClaimArtifactInput"
          type="file"
          accept="application/json,.json"
          @change="loadStageBClaimReceipt"
        />
      </label>
      <p v-if="stageBClaimReceiptBytes" class="notice">
        The coordinator's exact-one claim receipt is loaded in volatile memory.
        It will be bound to the Stage B artifact, hashed, and erased when
        capture is armed.
      </p>
      <p v-if="stageBClaimReceiptRejected" class="notice">
        The global Stage B claim receipt was rejected. Load the exact canonical
        receipt returned by the authoritative coordinator.
      </p>
      <label class="gate">
        <input v-model="capturePreflightAcknowledged" type="checkbox" />
        I confirm the external controller holds fresh evidence for every exact
        gate above. This checkbox is an execution latch only; it is not
        Production evidence or the global claim receipt itself.
      </label>
      <button
        :disabled="
          !capturePreflightAcknowledged ||
          !stageBBindingBytes ||
          !stageBClaimReceiptBytes ||
          snapshot.quietPeriodRemainingSeconds !== 0 ||
          snapshot.operationInFlight ||
          actionBusy
        "
        @click="confirmCredentialPreflight"
      >
        Arm credential capture once
      </button>
    </section>

    <section
      v-if="snapshot.expectedRole && !snapshot.cleared"
      class="panel"
      aria-labelledby="capture-heading"
    >
      <h2 id="capture-heading">Capture {{ roleLabel }}</h2>
      <p v-if="snapshot.quietPeriodRemainingSeconds > 0" class="notice">
        Operator auth quiet gate: {{ snapshot.quietPeriodRemainingSeconds }}s
        remaining. Credential inputs remain absent until it reaches zero.
      </p>
      <form v-else autocomplete="off" @submit.prevent="captureCurrentRole">
        <label>
          Username
          <input
            ref="usernameInput"
            type="text"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
          />
        </label>
        <label>
          Password
          <input
            ref="passwordInput"
            type="password"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
        <button type="submit" :disabled="!canCapture">Capture once</button>
      </form>
    </section>

    <section v-if="snapshot.state === 'READINESS_VERIFIED'" class="panel">
      <h2>Full-default-off baseline</h2>
      <ul
        id="task51-gates-baseline"
        class="gate-list"
        aria-label="Baseline exact gates"
      >
        <li v-for="[key, label] in externalGateLabels" :key="key">
          <code>{{ key }}</code>
          <span>{{ label }}</span>
        </li>
      </ul>
      <label class="gate">
        <input v-model="baselineAcknowledged" type="checkbox" />
        I confirm the external controller holds fresh evidence for every exact
        gate above. This checkbox is an execution latch only; it is not
        Production evidence.
      </label>
      <button
        :disabled="!baselineAcknowledged || snapshot.operationInFlight"
        @click="runBaseline"
      >
        Run 24-cell baseline once
      </button>
    </section>

    <section v-if="snapshot.state === 'BASELINE_READY'" class="panel">
      <h2>xrteeth shadow replay</h2>
      <ul
        id="task51-gates-shadow-open"
        class="gate-list"
        aria-label="Shadow-open exact gates"
      >
        <li v-for="[key, label] in shadowOpenGateLabels" :key="key">
          <code>{{ key }}</code>
          <span>{{ label }}</span>
        </li>
      </ul>
      <label class="gate">
        <input v-model="xrteethOpenAcknowledged" type="checkbox" />
        I confirm the external controller holds fresh evidence for every exact
        gate above. This checkbox is an execution latch only; it is not
        Production evidence.
      </label>
      <button
        :disabled="!xrteethOpenAcknowledged || snapshot.operationInFlight"
        @click="runXrteethShadow"
      >
        Run xrteeth 12-cell replay once
      </button>
    </section>

    <section v-if="snapshot.state === 'WAIT_XRTEETH_RESTORED'" class="panel">
      <h2>Restore xrteeth, then open tmrpp</h2>
      <h3>xrteeth restore gates</h3>
      <ul
        id="task51-gates-xrteeth-restore"
        class="gate-list"
        aria-label="xrteeth restore exact gates"
      >
        <li v-for="[key, label] in xrteethRestoreGateLabels" :key="key">
          <code>{{ key }}</code>
          <span>{{ label }}</span>
        </li>
      </ul>
      <label class="gate">
        <input v-model="xrteethRestoreAcknowledged" type="checkbox" />
        I confirm the external controller holds fresh evidence for every xrteeth
        restore gate above. This checkbox is an execution latch only; it is not
        Production evidence.
      </label>
      <h3>tmrpp shadow-open gates</h3>
      <ul
        id="task51-gates-tmrpp-open"
        class="gate-list"
        aria-label="tmrpp shadow-open exact gates"
      >
        <li v-for="[key, label] in shadowOpenGateLabels" :key="key">
          <code>{{ key }}</code>
          <span>{{ label }}</span>
        </li>
      </ul>
      <label class="gate">
        <input v-model="tmrppOpenAcknowledged" type="checkbox" />
        I confirm the external controller holds fresh evidence for every tmrpp
        shadow-open gate above. This checkbox is an execution latch only; it is
        not Production evidence.
      </label>
      <button
        :disabled="
          !xrteethRestoreAcknowledged ||
          !tmrppOpenAcknowledged ||
          snapshot.operationInFlight
        "
        @click="restoreXrteethAndRunTmrpp"
      >
        Acknowledge restore and run tmrpp once
      </button>
    </section>

    <section
      v-if="
        snapshot.state === 'TMRPP_SHADOW_RUNNING' &&
        snapshot.tmrppReplayComplete
      "
      class="panel"
    >
      <h2>Final restore and two-cycle closeout</h2>
      <ul
        id="task51-gates-final-restore"
        class="gate-list"
        aria-label="Final-restore exact gates"
      >
        <li v-for="[key, label] in finalRestoreGateLabels" :key="key">
          <code>{{ key }}</code>
          <span>{{ label }}</span>
        </li>
      </ul>
      <label>
        Current-Production direct matrix (canonical JSON)
        <input
          ref="productionDirectMatrixInput"
          type="file"
          accept="application/json,.json"
          :disabled="productionDirectMatrixBound || actionBusy"
          @change="loadProductionDirectMatrix"
        />
      </label>
      <p v-if="productionDirectMatrixBound" class="notice">
        The exact matrix is canonical, privacy-safe, Stage-B-bound, hashed, and
        erased from volatile upload memory.
      </p>
      <p v-if="productionDirectMatrixRejected" class="notice">
        The direct matrix was rejected. Load the exact current-window artifact.
      </p>
      <label class="gate">
        <input v-model="finalRestoreAcknowledged" type="checkbox" />
        I confirm the external controller holds fresh evidence for every exact
        gate above. This checkbox is an execution latch only; it is not
        Production evidence.
      </label>
      <button
        :disabled="
          !finalRestoreAcknowledged ||
          !productionDirectMatrixBound ||
          snapshot.operationInFlight
        "
        @click="finishAfterFinalRestore"
      >
        Clear captured references and complete
      </button>
    </section>

    <section class="panel" aria-label="Safe evidence summary">
      <h2>Safe evidence summary</h2>
      <ul>
        <li>
          ordinary-user negative: {{ snapshot.ordinaryUserNegativePassed }}
        </li>
        <li>root break-glass: {{ snapshot.rootBreakGlassPassed }}</li>
        <li>tmrpp replay complete: {{ snapshot.tmrppReplayComplete }}</li>
        <li>worker references cleared: {{ snapshot.cleared }}</li>
        <li>final evidence: {{ snapshot.finalEvidenceState }}</li>
        <li v-if="snapshot.failureCode">failure: {{ snapshot.failureCode }}</li>
      </ul>
    </section>

    <section
      v-if="
        snapshot.state === 'CLEARED' &&
        (snapshot.finalEvidenceState === 'READY' || finalExportAttempted)
      "
      class="panel"
      aria-label="One-time final evidence export"
    >
      <h2>One-time canonical evidence export</h2>
      <p>
        The fragment became available only after final restore and successful
        memory cleanup. Export uses the browser native save picker; it does not
        use storage, clipboard, console, page URL, or a Blob URL.
      </p>
      <button
        v-if="snapshot.finalEvidenceState === 'READY' && !finalExportAttempted"
        :disabled="actionBusy"
        @click="exportFinalEvidence"
      >
        Export canonical fragment once
      </button>
      <p v-if="exportedSha256">
        Export complete. SHA-256: <code>{{ exportedSha256 }}</code>
      </p>
      <p v-if="finalExportFailed" class="notice">
        Export did not complete. If the fragment was already taken, this page
        will not expose or consume it a second time.
      </p>
    </section>
  </main>
</template>

<style scoped lang="scss">
.task51-runner {
  max-width: 960px;
  min-height: 100%;
  padding: 32px;
  margin: 0 auto;
  color: var(--el-text-color-primary);
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--el-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

h1,
h2 {
  margin-top: 0;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin: 24px 0;
}

.status-grid div,
.panel {
  padding: 18px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
}

.status-grid span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.panel {
  margin-bottom: 16px;
}

.gate-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 12px 0;
  list-style: none;
}

.gate-list li {
  display: grid;
  grid-template-columns: minmax(220px, auto) 1fr;
  gap: 10px;
}

form,
.gate {
  display: grid;
  gap: 12px;
}

form label {
  display: grid;
  gap: 6px;
}

input[type="text"],
input[type="password"] {
  padding: 10px 12px;
  font: inherit;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

button {
  width: fit-content;
  padding: 10px 16px;
  margin-top: 12px;
  color: var(--el-color-white);
  cursor: pointer;
  background: var(--el-color-primary);
  border: 0;
  border-radius: 6px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.gate {
  grid-template-columns: auto 1fr;
  align-items: start;
  margin: 10px 0;
}

.notice {
  color: var(--el-color-warning-dark-2);
}
</style>
