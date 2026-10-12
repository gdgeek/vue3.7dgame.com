import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  TASK51_AUTHENTICATED_READ_CORS_NAMES,
  TASK51_BOOTSTRAP_READ_ALLOWLIST,
} from "../../../tools/identity/task51-network-attestor-ledger.mjs";
import {
  assertTask51NetworkFinalizationWindow,
  assertTask51StageAAttestorStageBBinding,
  claimTask51StageBWithFailureFence,
  createTask51FailureSignal,
  createTask51SafeRequestDescriptor,
  parseTask51AttestorArguments,
} from "../../../tools/identity/run-task51-headed-network-attestor.mjs";
import {
  TASK51_AUTH_QUIET_MS,
  TASK51_RUNNER_URL,
  TASK51_STAGE_B_CLAIM_URL,
  TASK51_WARM_URL,
  canonicalTask51StageBJson,
  claimPreparedTask51StageB,
  createTask51PreArmSupervisor,
  prepareTask51StageB,
  readTask51RunnerFragment,
} from "../../../tools/identity/task51-stage-b-supervisor.mjs";

const NOW_MS = Date.parse("2026-08-28T10:00:00+08:00");
const APPROVAL_REF = "WP3-TASK51-MEMORY-RUNNER-STAGE-B-20260828";
const EXECUTION_ID = "task51-stage-b-test-window-20260828";
const CAPABILITY = "Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2M";
const PRODUCTION_DIRECT_MATRIX_REF =
  "reports/task51-production-direct-matrix-test-fixture.json";
const ROLE_SUBJECT_DIGESTS = Object.freeze({
  user: "1".repeat(64),
  manager: "2".repeat(64),
  admin: "3".repeat(64),
  root: "4".repeat(64),
});

const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const PRODUCTION_DIRECT_MATRIX_SUBJECT_DIGEST = sha256(
  canonicalTask51StageBJson(ROLE_SUBJECT_DIGESTS)
);

function stageBValue(capability = CAPABILITY) {
  return {
    approvalRef: APPROVAL_REF,
    authorizedControlPostCount: 1,
    authorizedLogicalGetCount: 56,
    authorizedLoginCount: 4,
    authorizedLogoutCount: 4,
    claimCapabilitySha256: sha256(capability),
    coordinatorOrigin: "https://api.xrteeth.com",
    coordinatorServerPublishSha: "e".repeat(40),
    currentWindowOnly: true,
    executionId: EXECUTION_ID,
    expiresAt: "2026-08-28T11:00:00+08:00",
    issuedAt: "2026-08-28T09:55:00+08:00",
    oneShot: true,
    productionDirectMatrixAuthorizedCellCount: 256,
    productionDirectMatrixEvidenceRef: PRODUCTION_DIRECT_MATRIX_REF,
    productionDirectMatrixSchema: "wp3-task51-production-direct-matrix-v1",
    productionDirectMatrixSubjectDigest:
      PRODUCTION_DIRECT_MATRIX_SUBJECT_DIGEST,
    protocol: "wp3-task51-memory-runner-v1",
    schema: "wp3-task51-stage-b-execution-approval-v3",
    stageAApprovalRef: "WP3-REL-TASK51-MEMORY-RUNNER-STAGE-A-20260828",
    stageACoordinatorServerReleaseEvidenceSha256: "b".repeat(64),
    stageANetworkAttestorReleaseEvidenceSha256: "c".repeat(64),
    stageAReleaseEvidenceSha256: "a".repeat(64),
    status: "APPROVED",
  };
}

function claimReceiptValue(stageBSha256: string) {
  return {
    approvalRef: APPROVAL_REF,
    claimCount: 1,
    claimedAt: "2026-08-28T10:00:00+08:00",
    coordinatorOrigin: "https://api.xrteeth.com",
    coordinatorServerPublishSha: "e".repeat(40),
    executionId: EXECUTION_ID,
    expiresAt: "2026-08-28T11:00:00+08:00",
    globalExactOneClaimed: true,
    schema: "wp3-task51-stage-b-global-claim-receipt-v1",
    stageBExecutionEvidenceSha256: stageBSha256,
    state: "CLAIMED",
  };
}

function expectedCells() {
  const cells: Array<Record<string, unknown>> = [];
  const roles = ["user", "manager", "admin", "root"];
  const nodes = ["xrteeth", "tmrpp"];
  const paths = [
    "/v1/user/info",
    "/v1/plugin/verify-token",
    "/v1/organization/list",
  ];
  const append = (phase: string, node: string, role: string, path: string) => {
    const identityBearing = path !== "/v1/organization/list";
    const organizationDenied =
      !identityBearing && (role === "user" || role === "manager");
    cells.push({
      baselineParityMatched: phase === "shadow" ? true : null,
      crossNodeIdentityMatched: identityBearing
        ? phase === "readiness" && node === "xrteeth"
          ? null
          : true
        : null,
      expectedDecisionMatched: true,
      httpStatus: organizationDenied ? 403 : 200,
      ledgerKey: `${phase}|${node}|${role}|${path}`,
      node,
      path,
      phase,
      role,
      roleSubjectDigest:
        ROLE_SUBJECT_DIGESTS[role as keyof typeof ROLE_SUBJECT_DIGESTS],
      roleExact: identityBearing ? true : null,
      schemaPassed: true,
      transportPassed: true,
    });
  };
  for (const node of nodes) {
    for (const role of roles) append("readiness", node, role, paths[0]);
  }
  for (const phase of ["baseline", "shadow"]) {
    for (const node of nodes) {
      for (const role of roles) {
        for (const path of paths) append(phase, node, role, path);
      }
    }
  }
  return cells;
}

function fragmentValue(stageBSha256: string, claimReceiptSha256: string) {
  return {
    approvalRef: APPROVAL_REF,
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
    executionId: EXECUTION_ID,
    exportedAt: "2026-08-28T10:20:00+08:00",
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
    protocol: "wp3-task51-memory-runner-v1",
    productionDirectMatrixEvidenceRef: PRODUCTION_DIRECT_MATRIX_REF,
    productionDirectMatrixEvidenceSha256: "9".repeat(64),
    productionDirectMatrixSubjectDigest:
      PRODUCTION_DIRECT_MATRIX_SUBJECT_DIGEST,
    safeCellResults: expectedCells(),
    schema: "wp3-task51-runner-fragment-v3",
    stageBClaimedAt: "2026-08-28T10:00:00+08:00",
    stageBExecutionEvidenceSha256: stageBSha256,
    stageBGlobalClaimReceiptSha256: claimReceiptSha256,
  };
}

let directory: string;
let stageBPath: string;
let capabilityPath: string;
let claimReceiptPath: string;
let fragmentPath: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "task51-stage-b-supervisor-"));
  stageBPath = join(directory, "stage-b.json");
  capabilityPath = join(directory, "claim-capability");
  claimReceiptPath = join(directory, "claim-receipt.json");
  fragmentPath = join(directory, "runner-fragment.json");
  await writeFile(stageBPath, canonicalTask51StageBJson(stageBValue()));
  await writeFile(capabilityPath, CAPABILITY, { mode: 0o600 });
  await chmod(capabilityPath, 0o600);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function prepare() {
  return prepareTask51StageB(
    {
      approvalRef: APPROVAL_REF,
      claimCapabilityFilePath: capabilityPath,
      claimReceiptOutPath: claimReceiptPath,
      executionId: EXECUTION_ID,
      stageBArtifactPath: stageBPath,
    },
    { now: () => NOW_MS }
  );
}

describe("Task 5.1 exact-once Stage B claim", () => {
  it("validates before browser without claiming, then sends one exact POST", async () => {
    const prepared = await prepare();
    const stageBRaw = await readFile(stageBPath);
    const claimRaw = canonicalTask51StageBJson(
      claimReceiptValue(sha256(stageBRaw))
    );
    let capturedBody: Uint8Array | null = null;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      capturedBody = new Uint8Array(init.body as Uint8Array).slice();
      expect(init).toMatchObject({ method: "POST", redirect: "error" });
      expect(init.headers).toEqual({
        "Content-Type": "application/json",
        Origin: "https://d.xrugc.com",
        "X-Task51-Claim-Capability": CAPABILITY,
      });
      return new Response(claimRaw, {
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        status: 200,
      });
    });

    expect(fetchMock).not.toHaveBeenCalled();
    const claimed = await claimPreparedTask51StageB(prepared, {
      fetch: fetchMock,
      now: () => NOW_MS,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      TASK51_STAGE_B_CLAIM_URL,
      expect.any(Object)
    );
    expect(Buffer.from(capturedBody!)).toEqual(stageBRaw);
    expect(await readFile(claimReceiptPath, "utf8")).toBe(claimRaw);
    expect((await lstat(claimReceiptPath)).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(prepared)).not.toContain(CAPABILITY);
    expect(JSON.stringify(claimed)).not.toContain(CAPABILITY);
    expect(await readFile(claimReceiptPath, "utf8")).not.toContain(CAPABILITY);
  });

  it("does not retry a 409 and removes the reserved output", async () => {
    const prepared = await prepare();
    const fetchMock = vi.fn(
      async () => new Response("claimed", { status: 409 })
    );

    await expect(
      claimPreparedTask51StageB(prepared, {
        fetch: fetchMock,
        now: () => NOW_MS,
      })
    ).rejects.toThrow("TASK51_STAGE_B_CLAIM_HTTP_REJECTED");
    expect(fetchMock).toHaveBeenCalledOnce();
    await expect(lstat(claimReceiptPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("aborts and fully settles a delayed claim after a page failure", async () => {
    const prepared = await prepare();
    const stageBRaw = await readFile(stageBPath);
    const claimRaw = canonicalTask51StageBJson(
      claimReceiptValue(sha256(stageBRaw))
    );
    const controller = new AbortController();
    const failureSignal = createTask51FailureSignal(() => controller.abort());
    let releaseResponse!: () => void;
    let observedSignal: AbortSignal | undefined;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      observedSignal = init.signal ?? undefined;
      await responseGate;
      return new Response(claimRaw, {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    });

    let fenceSettled = false;
    const fencedClaim = claimTask51StageBWithFailureFence(
      prepared,
      failureSignal,
      controller,
      { fetch: fetchMock, now: () => NOW_MS }
    ).finally(() => {
      fenceSettled = true;
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    failureSignal.fail("TASK51_PAGE_ERROR");
    await Promise.resolve();
    expect(observedSignal?.aborted).toBe(true);
    expect(fenceSettled).toBe(false);
    releaseResponse();

    await expect(fencedClaim).rejects.toThrow("TASK51_PAGE_ERROR");
    expect(fenceSettled).toBe(true);
    await expect(lstat(claimReceiptPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("aborts a pending claim at the preclaim deadline without a late receipt", async () => {
    vi.useFakeTimers();
    try {
      const prepared = await prepare();
      const controller = new AbortController();
      const failureSignal = createTask51FailureSignal(() => controller.abort());
      let observedSignal: AbortSignal | undefined;
      const fetchMock = vi.fn(
        async (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            observedSignal = init.signal ?? undefined;
            init.signal?.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true }
            );
          })
      );
      const fencedClaim = claimTask51StageBWithFailureFence(
        prepared,
        failureSignal,
        controller,
        { fetch: fetchMock, now: () => NOW_MS }
      );
      const observedClaim = fencedClaim.then(
        () => null,
        (error: unknown) => error
      );
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      setTimeout(
        () => failureSignal.fail("TASK51_PRECLAIM_TOTAL_DEADLINE"),
        1_000
      );
      await vi.advanceTimersByTimeAsync(1_000);

      await expect(observedClaim).resolves.toMatchObject({
        message: "TASK51_PRECLAIM_TOTAL_DEADLINE",
      });
      expect(observedSignal?.aborted).toBe(true);
      await expect(lstat(claimReceiptPath)).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects an oversized response after one call and never writes it", async () => {
    const prepared = await prepare();
    const fetchMock = vi.fn(
      async () =>
        new Response("x".repeat(8 * 1024 + 1), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        })
    );

    await expect(
      claimPreparedTask51StageB(prepared, {
        fetch: fetchMock,
        now: () => NOW_MS,
      })
    ).rejects.toThrow("TASK51_STAGE_B_CLAIM_RESPONSE_TOO_LARGE");
    expect(fetchMock).toHaveBeenCalledOnce();
    await expect(lstat(claimReceiptPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects a 200 claim response without canonical JSON media type", async () => {
    const prepared = await prepare();
    const fetchMock = vi.fn(async () => new Response("{}\n", { status: 200 }));

    await expect(
      claimPreparedTask51StageB(prepared, {
        fetch: fetchMock,
        now: () => NOW_MS,
      })
    ).rejects.toThrow("TASK51_STAGE_B_CLAIM_CONTENT_TYPE_REJECTED");
    expect(fetchMock).toHaveBeenCalledOnce();
    await expect(lstat(claimReceiptPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects a canonical claim receipt whose Stage B binding mismatches", async () => {
    const prepared = await prepare();
    const mismatch = canonicalTask51StageBJson(
      claimReceiptValue("f".repeat(64))
    );
    const fetchMock = vi.fn(
      async () =>
        new Response(mismatch, {
          headers: { "Content-Type": "application/json" },
          status: 200,
        })
    );

    await expect(
      claimPreparedTask51StageB(prepared, {
        fetch: fetchMock,
        now: () => NOW_MS,
      })
    ).rejects.toThrow("TASK51_STAGE_B_CLAIM_RECEIPT_REJECTED");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("requires the capability file to remain regular, exact and 0600", async () => {
    await chmod(capabilityPath, 0o644);
    await expect(prepare()).rejects.toThrow("TASK51_STAGE_B_BINDING_REJECTED");

    await chmod(capabilityPath, 0o600);
    await writeFile(
      capabilityPath,
      "DIFFERENT_TEST_ONLY_CAPABILITY_0123456789"
    );
    await expect(prepare()).rejects.toThrow("TASK51_STAGE_B_BINDING_REJECTED");
  });

  it("rejects a hard-linked capability even when bytes and mode match", async () => {
    await link(capabilityPath, join(directory, "capability-second-link"));
    await expect(prepare()).rejects.toThrow("TASK51_STAGE_B_BINDING_REJECTED");
  });

  it("rejects nonexistent calendar dates instead of Date.parse normalization", async () => {
    await writeFile(
      stageBPath,
      canonicalTask51StageBJson({
        ...stageBValue(),
        issuedAt: "2026-02-30T09:55:00+08:00",
      })
    );
    await expect(prepare()).rejects.toThrow("TASK51_STAGE_B_ARTIFACT_REJECTED");
  });

  it.each([
    "reports/task51-production-direct-matrix.md",
    "reports//task51-production-direct-matrix.json",
    "reports/./task51-production-direct-matrix.json",
    "reports/../task51-production-direct-matrix.json",
  ])(
    "rejects unsafe Production matrix evidence ref %s",
    async (evidenceRef) => {
      await writeFile(
        stageBPath,
        canonicalTask51StageBJson({
          ...stageBValue(),
          productionDirectMatrixEvidenceRef: evidenceRef,
        })
      );
      await expect(prepare()).rejects.toThrow(
        "TASK51_STAGE_B_ARTIFACT_REJECTED"
      );
    }
  );

  it("never accepts a raw capability argument", () => {
    expect(() =>
      parseTask51AttestorArguments(["--claim-capability", CAPABILITY])
    ).toThrow("Unknown argument: --claim-capability");
  });

  it("rejects N finalization at or after the strict deadline", () => {
    const strictDeadlineMs = Date.parse("2026-08-28T02:30:00.000Z");
    expect(() =>
      assertTask51NetworkFinalizationWindow({
        finalizedAt: "2026-08-28T02:29:59.999Z",
        fragmentExportedAt: "2026-08-28T02:20:00.000Z",
        strictDeadlineMs,
      })
    ).not.toThrow();
    expect(() =>
      assertTask51NetworkFinalizationWindow({
        finalizedAt: "2026-08-28T02:30:00.000Z",
        fragmentExportedAt: "2026-08-28T02:20:00.000Z",
        strictDeadlineMs,
      })
    ).toThrow("TASK51_NETWORK_FINALIZED_AT_REJECTED");
    expect(() =>
      assertTask51NetworkFinalizationWindow({
        finalizedAt: "2026-08-28T02:19:59.999Z",
        fragmentExportedAt: "2026-08-28T02:20:00.000Z",
        strictDeadlineMs,
      })
    ).toThrow("TASK51_NETWORK_FINALIZED_AT_REJECTED");
  });

  it("binds Stage A attestor bytes, approval and Web release to the same B", () => {
    const stageB = stageBValue();
    const stageAAttestor = {
      sha256: stageB.stageANetworkAttestorReleaseEvidenceSha256,
      value: {
        approvalRef: stageB.stageAApprovalRef,
        webStageAReleaseEvidenceSha256: stageB.stageAReleaseEvidenceSha256,
      },
    };
    expect(() =>
      assertTask51StageAAttestorStageBBinding(stageAAttestor, stageB)
    ).not.toThrow();
    for (const forged of [
      { ...stageAAttestor, sha256: "f".repeat(64) },
      {
        ...stageAAttestor,
        value: {
          ...stageAAttestor.value,
          approvalRef: `${stageB.stageAApprovalRef}-DRIFT`,
        },
      },
      {
        ...stageAAttestor,
        value: {
          ...stageAAttestor.value,
          webStageAReleaseEvidenceSha256: "f".repeat(64),
        },
      },
    ]) {
      expect(() =>
        assertTask51StageAAttestorStageBBinding(forged, stageB)
      ).toThrow("TASK51_STAGE_A_ATTESTOR_STAGE_B_BINDING_REJECTED");
    }
  });

  it("accepts only pinned artifact paths, never caller-supplied release claims", () => {
    const stageAAttestorPath = join(directory, "stage-a-attestor.json");
    const parsed = parseTask51AttestorArguments([
      "--warm-url",
      TASK51_WARM_URL,
      "--runner-url",
      TASK51_RUNNER_URL,
      "--approval-ref",
      APPROVAL_REF,
      "--execution-id",
      EXECUTION_ID,
      "--stage-a-attestor-artifact",
      stageAAttestorPath,
      "--stage-b-artifact",
      stageBPath,
      "--claim-capability-file",
      capabilityPath,
      "--claim-receipt-out",
      claimReceiptPath,
      "--runner-fragment",
      fragmentPath,
      "--receipt-out",
      join(directory, "network-receipt.json"),
    ]);
    expect(parsed).toMatchObject({
      runnerFragmentPath: fragmentPath,
      stageAAttestorArtifactPath: stageAAttestorPath,
      stageBArtifactPath: stageBPath,
    });
    expect(parsed).not.toHaveProperty("runnerFragmentSha256");
    expect(parsed).not.toHaveProperty("stageBExecutionEvidenceSha256");
    expect(() =>
      parseTask51AttestorArguments(["--runner-fragment-sha256", "f".repeat(64)])
    ).toThrow("Unknown argument: --runner-fragment-sha256");
    expect(() =>
      parseTask51AttestorArguments(["--static-url", TASK51_WARM_URL])
    ).toThrow("Unknown argument: --static-url");
    expect(() =>
      parseTask51AttestorArguments(["--web-release-sha", "d".repeat(40)])
    ).toThrow("Unknown argument: --web-release-sha");
  });
});

describe("Task 5.1 final F v3 binding", () => {
  it("reads <=32KiB canonical F, validates all 56 cells and hashes raw bytes", async () => {
    const stageBRaw = await readFile(stageBPath);
    const stageBSha256 = sha256(stageBRaw);
    const claimRaw = canonicalTask51StageBJson(claimReceiptValue(stageBSha256));
    const fragmentRaw = canonicalTask51StageBJson(
      fragmentValue(stageBSha256, sha256(claimRaw))
    );
    await writeFile(fragmentPath, fragmentRaw);

    await expect(
      readTask51RunnerFragment(fragmentPath, {
        approvalRef: APPROVAL_REF,
        claimedAt: "2026-08-28T10:00:00+08:00",
        executionId: EXECUTION_ID,
        expiresAt: "2026-08-28T11:00:00+08:00",
        productionDirectMatrixEvidenceRef: PRODUCTION_DIRECT_MATRIX_REF,
        productionDirectMatrixSubjectDigest:
          PRODUCTION_DIRECT_MATRIX_SUBJECT_DIGEST,
        receiptSha256: sha256(claimRaw),
        stageBExecutionEvidenceSha256: stageBSha256,
      })
    ).resolves.toMatchObject({
      approvalRef: APPROVAL_REF,
      executionId: EXECUTION_ID,
      runnerFragmentSha256: sha256(fragmentRaw),
      productionDirectMatrixEvidenceRef: PRODUCTION_DIRECT_MATRIX_REF,
      productionDirectMatrixSubjectDigest:
        PRODUCTION_DIRECT_MATRIX_SUBJECT_DIGEST,
      stageBExecutionEvidenceSha256: stageBSha256,
    });
  });

  it("rejects F binding drift and oversized files", async () => {
    const stageBSha256 = sha256(await readFile(stageBPath));
    const claimSha256 = "b".repeat(64);
    await writeFile(
      fragmentPath,
      canonicalTask51StageBJson({
        ...fragmentValue(stageBSha256, claimSha256),
        executionId: "task51-stage-b-different-window",
      })
    );
    await expect(
      readTask51RunnerFragment(fragmentPath, {
        approvalRef: APPROVAL_REF,
        claimedAt: "2026-08-28T10:00:00+08:00",
        executionId: EXECUTION_ID,
        expiresAt: "2026-08-28T11:00:00+08:00",
        productionDirectMatrixEvidenceRef: PRODUCTION_DIRECT_MATRIX_REF,
        productionDirectMatrixSubjectDigest:
          PRODUCTION_DIRECT_MATRIX_SUBJECT_DIGEST,
        receiptSha256: claimSha256,
        stageBExecutionEvidenceSha256: stageBSha256,
      })
    ).rejects.toThrow("TASK51_RUNNER_FRAGMENT_REJECTED");

    await writeFile(fragmentPath, "x".repeat(32 * 1024 + 1));
    await expect(readTask51RunnerFragment(fragmentPath, {})).rejects.toThrow(
      "TASK51_BOUNDED_FILE_REJECTED"
    );
  });
});

describe("Task 5.1 pre-arm browser supervisor", () => {
  const BOOTSTRAP_USER_INFO = "https://api.xrteeth.com/v1/user/info";
  const descriptor = (
    id: string,
    method: string,
    url: string,
    corsRequestMethod: string | null = null,
    corsRequestHeaderNames: string | null = null
  ) => ({
    corsRequestHeaderNames,
    corsRequestMethod,
    id,
    method,
    redirected: false,
    resourceType: method === "OPTIONS" ? "other" : "fetch",
    url,
  });

  const completeBootstrap = (
    supervisor: ReturnType<typeof createTask51PreArmSupervisor>
  ) => {
    expect(
      supervisor.beginRequest(
        descriptor(
          "login-options",
          "OPTIONS",
          "https://api.xrteeth.com/v1/auth/login",
          "POST",
          "content-type"
        )
      ).allowed
    ).toBe(true);
    supervisor.finishRequest("login-options");
    expect(
      supervisor.beginRequest(
        descriptor("login", "POST", "https://api.xrteeth.com/v1/auth/login")
      ).allowed
    ).toBe(true);
    supervisor.finishRequest("login");
    for (const [index, url] of TASK51_BOOTSTRAP_READ_ALLOWLIST.entries()) {
      expect(
        supervisor.beginRequest(
          descriptor(
            `bootstrap-options-${index}`,
            "OPTIONS",
            url,
            "GET",
            TASK51_AUTHENTICATED_READ_CORS_NAMES
          )
        ).allowed
      ).toBe(true);
      supervisor.finishRequest(`bootstrap-options-${index}`);
      expect(
        supervisor.beginRequest(
          descriptor(`bootstrap-read-${index}`, "GET", url)
        ).allowed
      ).toBe(true);
      supervisor.finishRequest(`bootstrap-read-${index}`);
    }
  };

  it("allows bootstrap, exact root transition, then enforces 16m API silence", () => {
    const supervisor = createTask51PreArmSupervisor({
      bootstrapReadAllowlist: [...TASK51_BOOTSTRAP_READ_ALLOWLIST],
      staticUrls: [TASK51_WARM_URL],
    });
    completeBootstrap(supervisor);
    supervisor.enterTransition();
    expect(
      supervisor.beginRequest(
        descriptor(
          "preflight",
          "OPTIONS",
          "https://api.xrteeth.com/v1/user/info",
          "GET",
          TASK51_AUTHENTICATED_READ_CORS_NAMES
        )
      ).allowed
    ).toBe(true);
    supervisor.finishRequest("preflight");
    expect(
      supervisor.beginRequest(
        descriptor("root-info", "GET", "https://api.xrteeth.com/v1/user/info")
      ).allowed
    ).toBe(true);
    supervisor.finishRequest("root-info");
    supervisor.enterQuiet(NOW_MS);
    expect(() => supervisor.assertReadyToClaim(NOW_MS)).toThrow(
      "TASK51_PREARM_CLAIM_GATE_REJECTED"
    );
    supervisor.assertReadyToClaim(NOW_MS + TASK51_AUTH_QUIET_MS);
    expect(supervisor.snapshot()).toMatchObject({
      activeRequestCount: 0,
      mode: "strict",
      transitionOptionsCount: 1,
      transitionUserInfoGetCount: 1,
      unexpectedRequestCount: 0,
    });
  });

  it("fails any API request during runner quiet", () => {
    const supervisor = createTask51PreArmSupervisor({
      bootstrapReadAllowlist: [...TASK51_BOOTSTRAP_READ_ALLOWLIST],
      staticUrls: [TASK51_WARM_URL],
    });
    completeBootstrap(supervisor);
    supervisor.enterTransition();
    supervisor.beginRequest(
      descriptor("root-info", "GET", "https://api.xrteeth.com/v1/user/info")
    );
    supervisor.finishRequest("root-info");
    supervisor.enterQuiet(NOW_MS);
    expect(
      supervisor.beginRequest(
        descriptor("unexpected", "GET", "https://api.xrteeth.com/v1/user/info")
      ).allowed
    ).toBe(false);
  });

  it("fails closed for unlisted bootstrap reads and every other mutation", () => {
    expect(() =>
      createTask51PreArmSupervisor({
        bootstrapReadAllowlist: [],
        staticUrls: [TASK51_WARM_URL],
      })
    ).toThrow("TASK51_PREARM_BOOTSTRAP_ALLOWLIST_REJECTED");

    for (const invalidAllowlist of [
      [TASK51_BOOTSTRAP_READ_ALLOWLIST[0]],
      [...TASK51_BOOTSTRAP_READ_ALLOWLIST].reverse(),
      [TASK51_BOOTSTRAP_READ_ALLOWLIST[0], TASK51_BOOTSTRAP_READ_ALLOWLIST[0]],
    ]) {
      expect(() =>
        createTask51PreArmSupervisor({
          bootstrapReadAllowlist: invalidAllowlist,
          staticUrls: [TASK51_WARM_URL],
        })
      ).toThrow("TASK51_PREARM_BOOTSTRAP_ALLOWLIST_REJECTED");
    }

    for (const [method, url] of [
      ["PUT", BOOTSTRAP_USER_INFO],
      ["PATCH", BOOTSTRAP_USER_INFO],
      ["DELETE", BOOTSTRAP_USER_INFO],
      ["POST", "https://api.xrteeth.com/v1/user/info"],
      ["GET", "https://api.xrteeth.com/v1/organization/list"],
    ]) {
      const supervisor = createTask51PreArmSupervisor({
        bootstrapReadAllowlist: [...TASK51_BOOTSTRAP_READ_ALLOWLIST],
        staticUrls: [TASK51_WARM_URL],
      });
      expect(
        supervisor.beginRequest(descriptor(`bad-${method}`, method, url))
          .allowed
      ).toBe(false);
      expect(supervisor.snapshot().unexpectedRequestCount).toBe(1);
    }

    const outOfOrder = createTask51PreArmSupervisor({
      bootstrapReadAllowlist: [...TASK51_BOOTSTRAP_READ_ALLOWLIST],
      staticUrls: [TASK51_WARM_URL],
    });
    outOfOrder.beginRequest(
      descriptor("login", "POST", "https://api.xrteeth.com/v1/auth/login")
    );
    outOfOrder.finishRequest("login");
    expect(
      outOfOrder.beginRequest(
        descriptor("plugin-first", "GET", TASK51_BOOTSTRAP_READ_ALLOWLIST[1])
      ).allowed
    ).toBe(false);

    const incompleteCors = createTask51PreArmSupervisor({
      bootstrapReadAllowlist: [...TASK51_BOOTSTRAP_READ_ALLOWLIST],
      staticUrls: [TASK51_WARM_URL],
    });
    incompleteCors.beginRequest(
      descriptor("login", "POST", "https://api.xrteeth.com/v1/auth/login")
    );
    incompleteCors.finishRequest("login");
    expect(
      incompleteCors.beginRequest(
        descriptor(
          "old-incomplete-preflight",
          "OPTIONS",
          TASK51_BOOTSTRAP_READ_ALLOWLIST[0],
          "GET",
          "authorization"
        )
      ).allowed
    ).toBe(false);
  });
});

describe("Task 5.1 safe CORS descriptor", () => {
  function request(
    method: string,
    corsMethod = "POST",
    corsHeaderNames = "authorization, content-type"
  ) {
    return {
      headerValue: vi.fn(async (name: string) =>
        name === "access-control-request-method" ? corsMethod : corsHeaderNames
      ),
      method: () => method,
      redirectedFrom: () => null,
      resourceType: () => "fetch",
      url: () => "https://api.xrteeth.com/v1/auth/logout",
    };
  }

  it("reads no header for non-OPTIONS and only two safe CORS fields for OPTIONS", async () => {
    const get = request("GET");
    await expect(
      createTask51SafeRequestDescriptor(get, "get")
    ).resolves.toMatchObject({
      corsRequestHeaderNames: null,
      corsRequestMethod: null,
    });
    expect(get.headerValue).not.toHaveBeenCalled();

    const options = request("OPTIONS");
    await expect(
      createTask51SafeRequestDescriptor(options, "options")
    ).resolves.toMatchObject({
      corsRequestHeaderNames: "authorization, content-type",
      corsRequestMethod: "POST",
    });
    expect(options.headerValue.mock.calls.map(([name]) => name)).toEqual([
      "access-control-request-method",
      "access-control-request-headers",
    ]);
  });

  it.each([
    ["POST", "content-type"],
    ["POST", "authorization,content-type"],
    ["GET", "authorization"],
  ])("preserves the frozen %s/%s preflight tuple", async (method, names) => {
    const options = request("OPTIONS", method, names);
    await expect(
      createTask51SafeRequestDescriptor(options, `${method}-${names}`)
    ).resolves.toMatchObject({
      corsRequestHeaderNames: names,
      corsRequestMethod: method,
      method: "OPTIONS",
    });
  });
});
