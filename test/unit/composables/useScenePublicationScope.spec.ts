import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  reactive,
  ref,
} from "vue";
import { useScenePublicationScope } from "@/composables/useScenePublicationScope";
import { readBackScenePublication } from "@/utils/scenePublicationAcknowledgement";

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/api/v1/publication-history", async (original) => ({
  ...(await original<object>()),
  readVerifiedPublication: read,
}));

const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((dispose) => dispose());
  read.mockReset();
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

function mountScope() {
  const owner = reactive({ sceneId: 7, actorId: "3", editorTarget: "scene:1" });
  // The iframe messaging implementation changes its session without a Vue ref.
  let sessionId = "session-a";
  const visible = ref(true);
  let capture!: ReturnType<typeof useScenePublicationScope>;
  const Editor = defineComponent({
    setup() {
      capture = useScenePublicationScope(() => ({ ...owner, sessionId }));
      return () => h("div");
    },
  });
  const root = document.createElement("div");
  document.body.appendChild(root);
  const app = createApp({
    render: () =>
      h(KeepAlive, null, {
        default: () => (visible.value ? h(Editor) : null),
      }),
  });
  app.mount(root);
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  return {
    owner,
    capture,
    visible,
    changeSession: () => {
      sessionId = "session-b";
    },
  };
}

const snapshot = {
  id: 21,
  publicationVersionId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  contentHash: `sha256:${"a".repeat(64)}`,
  schemaVersion: 1,
  language: "lua",
};

describe("publication UI ownership", () => {
  it.each(["account", "scene", "editor", "session"] as const)(
    "discards a delayed refresh after a %s switch while preserving the receipt",
    async (switchType) => {
      const scope = mountScope();
      const isCurrent = scope.capture();
      const refresh = deferred<{ id: number }>();
      const apply = vi.fn();
      read.mockResolvedValue({ readBackVerified: true });
      const result = readBackScenePublication({
        sceneId: 7,
        snapshot,
        refresh: () => refresh.promise,
        apply,
        isCurrent,
      });
      if (switchType === "account") scope.owner.actorId = "4";
      if (switchType === "scene") scope.owner.sceneId = 8;
      if (switchType === "editor") scope.owner.editorTarget = "scene:2";
      if (switchType === "session") scope.changeSession();
      refresh.resolve({ id: 7 });
      expect(await result).toMatchObject({
        published: true,
        snapshotId: 21,
        verification: "server_acknowledged",
        readBackVerified: true,
        refreshSucceeded: false,
      });
      expect(apply).not.toHaveBeenCalled();
      expect(isCurrent()).toBe(false);
    }
  );

  it("invalidates the old scope even if the same account and scene return", () => {
    const scope = mountScope();
    const isCurrent = scope.capture();
    scope.owner.actorId = "4";
    scope.owner.actorId = "3";
    expect(isCurrent()).toBe(false);
    expect(scope.capture()()).toBe(true);
  });

  it("keeps a deactivated editor's old publication invalid after reactivation", async () => {
    const scope = mountScope();
    const isCurrent = scope.capture();
    scope.visible.value = false;
    await nextTick();
    expect(isCurrent()).toBe(false);
    scope.visible.value = true;
    await nextTick();
    expect(isCurrent()).toBe(false);
    expect(scope.capture()()).toBe(true);
  });

  it("allows the current refresh, but suppresses late feedback after archive verification", async () => {
    const scope = mountScope();
    const isCurrent = scope.capture();
    const archive = deferred<unknown>();
    const apply = vi.fn();
    read.mockReturnValue(archive.promise);
    const result = readBackScenePublication({
      sceneId: 7,
      snapshot,
      refresh: async () => ({ id: 7 }),
      apply,
      isCurrent,
    });
    await nextTick();
    expect(apply).toHaveBeenCalledWith({ id: 7 });
    expect(isCurrent()).toBe(true);
    scope.owner.actorId = "4";
    archive.resolve({ readBackVerified: true });
    expect(await result).toMatchObject({
      published: true,
      readBackVerified: true,
      refreshSucceeded: true,
    });
    expect(isCurrent()).toBe(false);
  });
});
