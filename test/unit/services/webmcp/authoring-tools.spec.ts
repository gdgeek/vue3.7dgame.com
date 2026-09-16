/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic tool payloads and deliberately malformed mock inputs. */
import { describe, it, expect, vi } from "vitest";
import {
  createAuthoringTools,
  type AuthoringDependencies,
} from "@/services/webmcp/authoring-tools";

const revision = `sha256:${"a".repeat(64)}`;
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const flush = async () => {
  for (let n = 0; n < 12; n++) await Promise.resolve();
};
function setup() {
  let actor: string | null = "3";
  let context = "scene:1";
  let now = 1;
  const saved = new Map<string, string>();
  const d: AuthoringDependencies = {
    actor: () => actor,
    context: () => context,
    now: () => now,
    canCreate: vi.fn(() => true),
    canUpload: vi.fn(() => true),
    capabilities: () => ({ tools: [] }),
    search: vi.fn(async () => []),
    searchAssets: vi.fn(async () => []),
    read: vi.fn(async (kind, id) => ({
      id,
      kind,
      name: "Demo",
      editable: true,
      imageId: 88,
      serverRevision: revision,
    })),
    asset: vi.fn(async (type, id) => ({
      id,
      type,
      name: "Cover",
      imageId: 9,
      fileId: 88,
      mimeType: "image/png",
      size: 100,
      metadata: null,
    })),
    create: vi.fn(async (draft) => ({ id: 123, uuid: draft.uuid })),
    cover: vi.fn(async (draft) => ({
      operationId: draft.operationId,
      targetId: draft.id,
      targetType: draft.kind === "entity" ? "meta" : "verse",
      action: "save",
      status: "completed",
      serverRevision: revision,
    })),
    receipt: vi.fn(),
    open: vi.fn(async () => true),
    confirm: vi.fn(async () => true),
    startUpload: vi.fn(async () => ({
      opened: true,
      uploadId: "u1",
      uploaded: false,
    })),
    uploadStatus: vi.fn(() => ({ status: "awaiting_file_selection" })),
    storage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => {
        saved.set(key, value);
      },
    },
  };
  let tools = createAuthoringTools(d);
  const call = async (name: string, input: unknown = {}) =>
    tools.find((t) => t.name === `xrugc_${name}`)!.execute(input) as any;
  const stage = (extra: object = {}) =>
    call("stage_authoring_creation", {
      kind: "scene",
      name: "New scene",
      ...extra,
    });
  const complete = (draft: any) =>
    call("complete_authoring_draft", { draftId: draft.draftId });
  const status = (draft: any) =>
    call("get_authoring_operation", { operationId: draft.operationId });
  return {
    d,
    call,
    stage,
    complete,
    status,
    saved,
    changeActor: (id: string | null) => {
      actor = id;
    },
    changeContext: () => {
      context += ":changed";
    },
    expire: () => {
      now += 300001;
    },
    reload: () => {
      tools = createAuthoringTools(d);
    },
  };
}
describe("global authoring tools", () => {
  it("stages without writes and returns a real created ID after confirmation", async () => {
    const s = setup();
    const draft = await s.stage();
    expect(s.d.create).not.toHaveBeenCalled();
    expect(await s.complete(draft)).toMatchObject({
      status: "awaiting_confirmation",
    });
    await flush();
    expect(await s.status(draft)).toMatchObject({
      status: "completed",
      targetId: 123,
      result: { coverDisplayVerified: false },
    });
  });
  it("reserves before concurrent completion and confirmation only happens once", async () => {
    const s = setup();
    const gate = deferred<boolean>();
    vi.mocked(s.d.confirm).mockReturnValue(gate.promise);
    const draft = await s.stage();
    await Promise.all([s.complete(draft), s.complete(draft)]);
    expect(s.d.confirm).toHaveBeenCalledTimes(1);
    gate.resolve(true);
    await flush();
    await s.complete(draft);
    expect(s.d.create).toHaveBeenCalledTimes(1);
  });
  it.each(["cancel", "route", "account", "expiry"])(
    "does not submit after %s during confirmation",
    async (mode) => {
      const s = setup();
      const gate = deferred<boolean>();
      vi.mocked(s.d.confirm).mockReturnValue(gate.promise);
      const draft = await s.stage();
      await s.complete(draft);
      if (mode === "route") s.changeContext();
      if (mode === "account") s.changeActor("4");
      if (mode === "expiry") s.expire();
      gate.resolve(mode !== "cancel");
      await flush();
      expect(s.d.create).not.toHaveBeenCalled();
    }
  );
  it("checks permission again after confirmation", async () => {
    const s = setup();
    const gate = deferred<boolean>();
    vi.mocked(s.d.confirm).mockReturnValue(gate.promise);
    const draft = await s.stage();
    await s.complete(draft);
    vi.mocked(s.d.canCreate).mockReturnValue(false);
    gate.resolve(true);
    await flush();
    expect(s.d.create).not.toHaveBeenCalled();
    expect(await s.status(draft)).toMatchObject({ status: "rejected" });
  });
  it("blocks anonymous and invalid requests before any API", async () => {
    const s = setup();
    await expect(s.stage({ kind: "bad" })).rejects.toThrow();
    s.changeActor(null);
    await expect(s.stage()).rejects.toThrow("登录");
    expect(s.d.create).not.toHaveBeenCalled();
  });
  it("marks lost creation acknowledgment unknown and never replays even after reload", async () => {
    const s = setup();
    vi.mocked(s.d.create).mockRejectedValue(new Error("timeout"));
    const draft = await s.stage();
    await s.complete(draft);
    await flush();
    expect(await s.status(draft)).toMatchObject({
      status: "unknown",
      retrySafe: false,
    });
    s.reload();
    await s.complete(draft);
    expect(s.d.create).toHaveBeenCalledTimes(1);
    expect((await s.status(draft)).creationUuid).toBe(
      draft.preview.creationUuid
    );
  });
  it("restores an interrupted submitting operation as unknown", async () => {
    const s = setup();
    vi.mocked(s.d.create).mockReturnValue(
      deferred<{ id: number; uuid: string }>().promise
    );
    const draft = await s.stage();
    await s.complete(draft);
    await flush();
    s.reload();
    expect(await s.status(draft)).toMatchObject({ status: "unknown" });
    await s.complete(draft);
    expect(s.d.create).toHaveBeenCalledTimes(1);
  });
  it("does not persist draft text or resource metadata", async () => {
    const s = setup();
    const draft = await s.stage({
      name: "private content",
      description: "private description",
    });
    await s.complete(draft);
    await flush();
    expect([...s.saved.values()].join()).not.toContain("private");
  });
  it("rejects a response with the wrong creation UUID", async () => {
    const s = setup();
    vi.mocked(s.d.create).mockResolvedValue({ id: 123, uuid: "unrelated" });
    const draft = await s.stage();
    await s.complete(draft);
    await flush();
    expect(await s.status(draft)).toMatchObject({ status: "unknown" });
  });
  it("does not disclose previous user search responses", async () => {
    const s = setup();
    const gate = deferred<[]>();
    vi.mocked(s.d.search).mockReturnValue(gate.promise);
    const pending = s.call("search_authoring_objects", { kind: "scene" });
    s.changeActor("4");
    gate.resolve([]);
    await expect(pending).rejects.toThrow("账号");
  });
  it("does not navigate after source page changes during permission lookup", async () => {
    const s = setup();
    const read = s.d.read;
    vi.mocked(s.d.read).mockImplementationOnce(async (kind, id) => {
      s.changeContext();
      return { id, kind, name: "test", imageId: null, editable: true };
    });
    expect(
      await s.call("open_authoring_object", { kind: "entity", id: 1 })
    ).toMatchObject({ opened: false });
    expect(s.d.open).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalled();
  });
  it("reports blocked navigation accurately", async () => {
    const s = setup();
    vi.mocked(s.d.open).mockResolvedValue(false);
    expect(
      await s.call("open_authoring_object", { kind: "scene", id: 1 })
    ).toMatchObject({ opened: false });
  });
  it("uses the picture file ID rather than resource ID or thumbnail", async () => {
    const s = setup();
    const draft = await s.call("stage_object_cover", {
      kind: "entity",
      id: 1,
      pictureResourceId: 7,
    });
    expect(draft.preview.imageId).toBe(88);
    await s.complete(draft);
    await flush();
    expect(s.d.cover).toHaveBeenCalledWith(
      expect.objectContaining({ imageId: 88, revision, id: 1 })
    );
    expect(await s.status(draft)).toMatchObject({
      status: "completed",
      result: { bindingVerified: true, coverDisplayVerified: false },
    });
  });
  it("rejects non-picture resources", async () => {
    const s = setup();
    vi.mocked(s.d.asset).mockResolvedValue({
      id: 7,
      type: "video",
      name: "x",
      imageId: 9,
      fileId: 88,
      mimeType: null,
      size: null,
      metadata: null,
    });
    await expect(s.stage({ pictureResourceId: 7 })).rejects.toThrow("图片素材");
  });
  it("rechecks a replaced picture after user confirmation", async () => {
    const s = setup();
    const draft = await s.stage({ pictureResourceId: 7 });
    vi.mocked(s.d.asset).mockResolvedValue({
      id: 7,
      type: "picture",
      name: "x",
      imageId: 9,
      fileId: 89,
      mimeType: null,
      size: null,
      metadata: null,
    });
    await s.complete(draft);
    await flush();
    expect(await s.status(draft)).toMatchObject({ status: "conflict" });
    expect(s.d.create).not.toHaveBeenCalled();
  });
  it("reports revision conflict without retry", async () => {
    const s = setup();
    vi.mocked(s.d.cover).mockRejectedValue({ response: { status: 409 } });
    const draft = await s.call("stage_object_cover", {
      kind: "scene",
      id: 1,
      pictureResourceId: 7,
    });
    await s.complete(draft);
    await flush();
    expect(await s.status(draft)).toMatchObject({ status: "conflict" });
    await s.complete(draft);
    expect(s.d.cover).toHaveBeenCalledTimes(1);
  });
  it("retains acknowledgment if readback fails", async () => {
    const s = setup();
    const draft = await s.call("stage_object_cover", {
      kind: "scene",
      id: 1,
      pictureResourceId: 7,
    });
    vi.mocked(s.d.read).mockRejectedValue(new Error("offline"));
    await s.complete(draft);
    await flush();
    expect(await s.status(draft)).toMatchObject({
      status: "completed",
      result: { bindingVerified: false, receipt: { status: "completed" } },
    });
  });
  it("resolves unknown cover through receipt without issuing another write", async () => {
    const s = setup();
    vi.mocked(s.d.cover).mockRejectedValue(new Error("timeout"));
    const draft = await s.call("stage_object_cover", {
      kind: "scene",
      id: 1,
      pictureResourceId: 7,
    });
    await s.complete(draft);
    await flush();
    vi.mocked(s.d.receipt).mockResolvedValue({
      operationId: draft.operationId,
      targetType: "verse",
      targetId: 1,
      action: "save",
      status: "completed",
      serverRevision: revision,
    });
    expect(await s.status(draft)).toMatchObject({ status: "completed" });
    expect(s.d.cover).toHaveBeenCalledTimes(1);
  });
  it("hides operations from another account", async () => {
    const s = setup();
    const draft = await s.stage();
    await s.complete(draft);
    await flush();
    s.changeActor("4");
    expect(await s.status(draft)).toEqual({ status: "not_found" });
  });
  it("does not confuse opening upload with completion", async () => {
    const s = setup();
    expect(
      await s.call("start_authoring_upload", { resourceType: "picture" })
    ).toMatchObject({ uploaded: false });
    expect(
      await s.call("get_authoring_upload", { uploadId: "u1" })
    ).toMatchObject({ status: "awaiting_file_selection" });
  });
  it("enforces backend description limits before asking to write", async () => {
    const s = setup();
    await expect(s.stage({ description: "x".repeat(256) })).rejects.toThrow();
    expect(s.d.create).not.toHaveBeenCalled();
  });
});
