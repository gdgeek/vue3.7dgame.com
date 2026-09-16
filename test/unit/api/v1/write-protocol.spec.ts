import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/utils/request", () => ({ default: mocks.request }));
import { guardedWrite, createWriteOptions } from "@/api/v1/write-protocol";
const revision = `sha256:${"a".repeat(64)}`;
const target = { targetType: "verse" as const, targetId: 2329 };
beforeEach(() => vi.clearAllMocks());
describe("guarded persistence", () => {
  it("pairs the original revision with the operation id, and accepts only its receipt", async () => {
    const write = { ...createWriteOptions(revision), onAcknowledged: vi.fn() };
    const receipt = {
      ...target,
      operationId: write.operationId,
      serverRevision: revision,
      action: "save",
      status: "completed",
    };
    mocks.request.mockResolvedValue({
      data: { writeReceipt: receipt, serverRevision: revision },
    });
    await guardedWrite(
      "/v1/verses/2329",
      "put",
      { data: {} },
      target,
      "save",
      write
    );
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "Idempotency-Key": write.operationId,
          "If-Match": `"${revision}"`,
        },
      })
    );
    expect(write.onAcknowledged).toHaveBeenCalledWith(receipt);
  });
  it("fails before sending if the loaded object has no server revision", () => {
    expect(() => createWriteOptions(undefined)).toThrow("服务器内容版本");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("does not retry when a write times out", async () => {
    mocks.request.mockRejectedValue(new Error("timeout"));
    await expect(
      guardedWrite(
        "/v1/verses/2329",
        "put",
        {},
        target,
        "save",
        createWriteOptions(revision)
      )
    ).rejects.toThrow("timeout");
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("rejects a response from an old backend without a matched acknowledgment", async () => {
    mocks.request.mockResolvedValue({ data: { id: 2329 } });
    await expect(
      guardedWrite(
        "/v1/verses/2329",
        "put",
        {},
        target,
        "save",
        createWriteOptions(revision)
      )
    ).rejects.toThrow("不要重复提交");
  });
});

import {
  setConflictScope,
  conflictCopy,
} from "@/services/webmcp/conflict-recovery";
it("keeps the rejected submission without rebasing or retrying", async () => {
  setConflictScope({ ...target, actorId: "3", page: "/verse/scene" });
  const payload = { data: { name: "local" } };
  const write = createWriteOptions(revision);
  mocks.request.mockRejectedValueOnce({ response: { status: 409 } });
  await expect(
    guardedWrite("/v1/verses/2329", "put", payload, target, "save", write)
  ).rejects.toMatchObject({ response: { status: 409 } });
  payload.data.name = "later";
  expect(conflictCopy.value?.localJson).toContain("local");
  expect(conflictCopy.value?.expectedRevision).toBe(revision);
  expect(mocks.request).toHaveBeenCalledTimes(1);
  setConflictScope(null);
  expect(conflictCopy.value).toBeNull();
});
it("discards late conflicts after navigation or account switch", async () => {
  setConflictScope({ ...target, actorId: "3", page: "/verse/scene" });
  let reject!: (value: unknown) => void;
  mocks.request.mockImplementationOnce(
    () =>
      new Promise((_, r) => {
        reject = r;
      })
  );
  const pending = guardedWrite(
    "/v1/verses/2329",
    "put",
    { data: {} },
    target,
    "save",
    createWriteOptions(revision)
  );
  setConflictScope({ ...target, actorId: "24", page: "/verse/scene" });
  reject({ response: { status: 409 } });
  await expect(pending).rejects.toMatchObject({ response: { status: 409 } });
  expect(conflictCopy.value).toBeNull();
  setConflictScope(null);
});
