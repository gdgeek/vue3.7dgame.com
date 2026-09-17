import { beforeEach, describe, expect, it, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
vi.mock("@/utils/request", () => ({ default: request }));
import {
  createAuthoringObject,
  getAuthoringCreation,
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
});
