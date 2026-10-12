import { beforeEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/utils/request", () => ({ default: request }));
import {
  createAuthoringObject,
  getAuthoringCreation,
  lookupAuthoringCreation,
  creationQueryFailure,
  CreationEvidenceError,
} from "@/api/v1/authoring-create";
const id = "8bfe365e-4faf-47b2-a7fd-cc3b7332b77d";
const revision = `sha256:${"a".repeat(64)}`;
const ack = () => ({
  id: 7,
  uuid: "f41e25e2-0fe5-48db-a7a5-7bff772a9a99",
  serverRevision: revision,
  replayed: false,
  writeReceipt: {
    operationId: id,
    action: "create",
    status: "completed",
    targetType: "meta",
    targetId: 7,
    uuid: "f41e25e2-0fe5-48db-a7a5-7bff772a9a99",
    serverRevision: revision,
  },
});
beforeEach(() => {
  request.mockReset();
});
describe("durable creation API contract", () => {
  it("sends one original idempotency key and can query it without an object ID", async () => {
    request.mockResolvedValue({ data: ack() });
    const body = { title: "entity", uuid: ack().uuid };
    await createAuthoringObject("entity", id, body);
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: "/v1/metas",
        method: "post",
        data: body,
        headers: { "Idempotency-Key": id },
      })
    );
    await getAuthoringCreation("entity", id);
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: `/v1/metas/create-operations/${id}`,
        method: "get",
      })
    );
  });
  it.each(["missing", "operation", "kind", "target", "revision", "uuid"])(
    "rejects a %s or mismatched creation acknowledgment",
    async (fault) => {
      const data = ack();
      if (fault === "missing") Reflect.deleteProperty(data, "writeReceipt");
      if (fault === "operation") data.writeReceipt.operationId = "other";
      if (fault === "kind") data.writeReceipt.targetType = "verse";
      if (fault === "target") data.writeReceipt.targetId++;
      if (fault === "revision")
        data.serverRevision = `sha256:${"b".repeat(64)}`;
      if (fault === "uuid") data.uuid = "";
      request.mockResolvedValue({ data });
      await expect(createAuthoringObject("entity", id, {})).rejects.toThrow(
        "回执"
      );
      expect(request).toHaveBeenCalledTimes(1);
    }
  );
  it("never silently retries transport failures or sends invalid keys", async () => {
    await expect(createAuthoringObject("scene", "invalid", {})).rejects.toThrow(
      "ID"
    );
    expect(request).not.toHaveBeenCalled();
    request.mockRejectedValue(new Error("offline"));
    await expect(createAuthoringObject("scene", id, {})).rejects.toThrow(
      "offline"
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  const lookup = () => ({
    contractVersion: "creation-recovery-v1",
    targetType: "meta",
    operationId: id,
    creationUuid: ack().uuid,
    status: "observed",
    reason: "uuid_match_without_receipt",
    verification: "uuid_readback",
    operationVerified: false,
    retrySafe: false,
    id: 7,
    uuid: ack().uuid,
    currentRevision: revision,
  });
  it("queries original identifiers without an object ID and keeps UUID evidence distinct", async () => {
    request.mockResolvedValue({ data: lookup() });
    const result = await lookupAuthoringCreation("entity", {
      operationId: id,
      creationUuid: ack().uuid,
    });
    expect(result).toMatchObject({
      status: "observed",
      operationVerified: false,
    });
    expect(result.writeReceipt).toBeUndefined();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/v1/metas/create-operations",
        method: "get",
        params: { operationId: id, creationUuid: ack().uuid },
      })
    );
  });
  it("accepts real receipts only when they match both supplied original identifiers", async () => {
    request.mockResolvedValue({
      data: {
        ...lookup(),
        ...ack(),
        status: "completed",
        reason: "creation_receipt",
        verification: "server_acknowledged",
        operationVerified: true,
      },
    });
    expect(
      await lookupAuthoringCreation("entity", {
        operationId: id,
        creationUuid: ack().uuid,
      })
    ).toMatchObject({ status: "completed" });
    const data = {
      ...lookup(),
      ...ack(),
      status: "completed",
      verification: "server_acknowledged",
      operationVerified: true,
    };
    data.uuid = "not-original";
    data.writeReceipt.uuid = "not-original";
    request.mockResolvedValue({ data });
    await expect(
      lookupAuthoringCreation("entity", {
        operationId: id,
        creationUuid: ack().uuid,
      })
    ).rejects.toBeInstanceOf(CreationEvidenceError);
  });
  it.each([
    "uuid",
    "kind",
    "operation",
    "revision",
    "receipt",
    "not_observed_id",
    "verified",
  ])("rejects malformed or fabricated %s lookup evidence", async (fault) => {
    const data: Record<string, unknown> = lookup();
    if (fault === "uuid") data.uuid = "other";
    if (fault === "kind") data.targetType = "verse";
    if (fault === "operation") data.operationId = "other";
    if (fault === "revision") data.currentRevision = "invalid";
    if (fault === "receipt") data.writeReceipt = ack().writeReceipt;
    if (fault === "not_observed_id") data.status = "not_observed";
    if (fault === "verified") data.operationVerified = true;
    request.mockResolvedValue({ data });
    await expect(
      lookupAuthoringCreation("entity", {
        operationId: id,
        creationUuid: ack().uuid,
      })
    ).rejects.toBeInstanceOf(CreationEvidenceError);
  });
  it.each([
    [401, "authentication_required"],
    [403, "permission_denied"],
    [404, "receipt_or_endpoint_not_observed"],
    [409, "operation_conflict"],
    [500, "query_unavailable"],
  ])(
    "preserves HTTP %s query failure without claiming no creation",
    (status, reason) => {
      expect(creationQueryFailure({ response: { status } })).toMatchObject({
        status: "unknown",
        operationStatus: "indeterminate",
        reason,
        retrySafe: false,
      });
    }
  );
});
