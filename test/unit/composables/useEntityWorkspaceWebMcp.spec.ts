import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, KeepAlive, nextTick, ref } from "vue";
import { useEntityWorkspaceWebMcp } from "@/composables/useEntityWorkspaceWebMcp";
import {
  registerWebMcpTools,
  type WebMcpTool,
} from "@/services/webmcp/model-context";
import type { EntityWorkspaceContext } from "@/services/webmcp/entity-workspace-tools";

const CONTEXT = "xrugc_get_entity_workspace_context";
const OPEN = "xrugc_open_entity_script_editor";
const CLOSE = "xrugc_close_entity_script_editor";
const cleanups: Array<() => void> = [];

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

function mountWorkspace() {
  const registry = new Map<string, WebMcpTool>();
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool(tool: WebMcpTool, { signal }: { signal: AbortSignal }) {
        registry.set(tool.name, tool);
        signal.addEventListener("abort", () => {
          if (registry.get(tool.name) === tool) registry.delete(tool.name);
        });
      },
    },
  });
  const ownerId = ref(809);
  const visible = ref(true);
  const scriptOpen = ref(false);
  const scriptDirty = ref(false);
  const openGate = ref<ReturnType<typeof deferred> | null>(null);
  const closeGate = ref<ReturnType<typeof deferred> | null>(null);
  const allowClose = ref(true);
  const context = (): EntityWorkspaceContext => ({
    entityId: ownerId.value,
    entityTitle: `Entity ${ownerId.value}`,
    activeEditor: scriptOpen.value ? "entity-script" : "entity",
    entity: { ready: true, dirty: false, saving: false },
    script: {
      open: scriptOpen.value,
      ready: scriptOpen.value,
      dirty: scriptDirty.value,
      saving: false,
      tab: scriptOpen.value ? "blockly" : null,
    },
  });
  let editorLifecycle: AbortController | null = null;
  const switchEditorTools = (script: boolean) => {
    editorLifecycle?.abort();
    editorLifecycle = registerWebMcpTools([
      {
        name: script ? "xrugc_get_meta_script" : "xrugc_get_editor_context",
        description: "Current editor test adapter",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: context,
      },
    ]);
  };
  switchEditorTools(false);
  const opened = vi.fn();
  const closed = vi.fn();
  const Workspace = defineComponent({
    setup() {
      useEntityWorkspaceWebMcp({
        ownerId: () => ownerId.value,
        getContext: context,
        openScriptEditor: async (assertActive) => {
          if (openGate.value) await openGate.value.promise;
          assertActive();
          opened();
          scriptOpen.value = true;
          switchEditorTools(true);
        },
        closeScriptEditor: async (assertActive) => {
          if (closeGate.value) await closeGate.value.promise;
          assertActive();
          if (!allowClose.value) return false;
          closed();
          scriptOpen.value = false;
          switchEditorTools(false);
          return true;
        },
      });
      return () => h("div", "workspace");
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(KeepAlive, null, {
        default: () => (visible.value ? h(Workspace) : null),
      }),
  });
  app.mount(host);
  const dispose = () => {
    app.unmount();
    editorLifecycle?.abort();
    host.remove();
  };
  cleanups.push(dispose);
  return {
    registry,
    ownerId,
    visible,
    scriptOpen,
    scriptDirty,
    openGate,
    closeGate,
    allowClose,
    opened,
    closed,
  };
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  delete (document as Document & { modelContext?: unknown }).modelContext;
});

describe("entity workspace WebMCP lifecycle", () => {
  it("keeps navigation tools registered across entity → script drawer → entity on the same route", async () => {
    const { registry, scriptDirty } = mountWorkspace();
    const navigation = [CONTEXT, OPEN, CLOSE].map((name) => registry.get(name));
    expect(registry.has("xrugc_get_editor_context")).toBe(true);
    await expect(registry.get(OPEN)!.execute({})).resolves.toMatchObject({
      status: "opened",
      context: { activeEditor: "entity-script" },
    });
    expect(registry.has("xrugc_get_editor_context")).toBe(false);
    expect(registry.has("xrugc_get_meta_script")).toBe(true);
    scriptDirty.value = true;
    expect(await registry.get(CONTEXT)!.execute({})).toMatchObject({
      script: { dirty: true },
    });
    await expect(registry.get(CLOSE)!.execute({})).resolves.toMatchObject({
      status: "closed",
      context: { activeEditor: "entity" },
    });
    expect(registry.has("xrugc_get_meta_script")).toBe(false);
    expect(registry.has("xrugc_get_editor_context")).toBe(true);
    expect([CONTEXT, OPEN, CLOSE].map((name) => registry.get(name))).toEqual(
      navigation
    );
  });

  it("keeps the script tool set when the user cancels closing", async () => {
    const { registry, allowClose, scriptDirty, closed } = mountWorkspace();
    await registry.get(OPEN)!.execute({});
    allowClose.value = false;
    scriptDirty.value = true;
    await expect(registry.get(CLOSE)!.execute({})).resolves.toMatchObject({
      status: "cancelled",
      context: { script: { open: true, dirty: true } },
    });
    expect(closed).not.toHaveBeenCalled();
    expect(registry.has("xrugc_get_meta_script")).toBe(true);
  });

  it("rejects an old owner's pending open before it can open the new owner's drawer", async () => {
    const { registry, ownerId, openGate, opened } = mountWorkspace();
    const gate = deferred();
    openGate.value = gate;
    const oldContext = registry.get(CONTEXT)!;
    const pending = registry.get(OPEN)!.execute({});
    ownerId.value = 810;
    const failed = expect(pending).resolves.toMatchObject({
      isError: true,
      errorCode: "session_closed",
    });
    gate.resolve();
    await failed;
    expect(opened).not.toHaveBeenCalled();
    await expect(oldContext.execute({})).resolves.toMatchObject({
      isError: true,
      errorCode: "session_closed",
    });
    expect(await registry.get(CONTEXT)!.execute({})).toMatchObject({
      entityId: 810,
    });
  });

  it("invalidates a pending close confirmation when the owner changes", async () => {
    const { registry, ownerId, closeGate, closed, scriptOpen } =
      mountWorkspace();
    await registry.get(OPEN)!.execute({});
    const gate = deferred();
    closeGate.value = gate;
    const pending = registry.get(CLOSE)!.execute({});
    ownerId.value = 810;
    const failed = expect(pending).resolves.toMatchObject({
      isError: true,
      errorCode: "session_closed",
    });
    gate.resolve();
    await failed;
    expect(closed).not.toHaveBeenCalled();
    expect(scriptOpen.value).toBe(true);
  });

  it("unregisters on deactivation and re-registers on return without reviving stale tools", async () => {
    const { registry, visible } = mountWorkspace();
    const oldOpen = registry.get(OPEN)!;
    visible.value = false;
    await nextTick();
    expect(registry.has(OPEN)).toBe(false);
    expect(registry.has(CLOSE)).toBe(false);
    expect(registry.has(CONTEXT)).toBe(false);
    await expect(oldOpen.execute({})).resolves.toMatchObject({
      isError: true,
      errorCode: "session_closed",
    });
    visible.value = true;
    await nextTick();
    expect(registry.get(OPEN)).toBeDefined();
    expect(registry.get(OPEN)).not.toBe(oldOpen);
  });
});
