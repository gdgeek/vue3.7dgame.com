import { describe, expect, it } from "vitest";
import { reactive } from "vue";
import {
  scriptPersistenceVersion,
  useScriptPersistenceGuard,
} from "@/composables/useScriptPersistenceGuard";
import type { ScriptDrawerStateChange } from "@/components/script-drawer-types";

const revision = "revision-a";
const createGuard = () => {
  const owner = reactive({
    id: 7 as number | null,
    revision: revision as string | null,
    scriptVersion: scriptPersistenceVersion({
      blockly: "{}",
      js: "old()",
      lua: "old()",
    }),
    session: "session-a" as string | null,
  });
  const guard = useScriptPersistenceGuard(() => owner);
  const update = (
    needsPersistence: boolean,
    overrides: Partial<ScriptDrawerStateChange> = {}
  ) =>
    guard.update({
      editorKey: 7,
      ownerRevision: owner.revision,
      state: {
        open: true,
        ready: true,
        dirty: false,
        needsPersistence,
        saving: false,
        tab: "blockly",
      },
      ...overrides,
    });
  return { owner, guard, update };
};

describe("script persistence guard", () => {
  it("retains adapted script requirements through drawer destruction and same-source server reloads", () => {
    const { owner, guard, update } = createGuard();
    update(true);
    expect(guard.needsPersistence.value).toBe(true);
    Object.assign(owner, { ...owner }); // a fresh server object with the same persisted code
    update(false, {
      state: {
        open: true,
        ready: false,
        dirty: false,
        needsPersistence: false,
        saving: false,
        tab: null,
      },
    });
    expect(guard.needsPersistence.value).toBe(true);
    update(false, {
      state: {
        open: false,
        ready: false,
        dirty: false,
        needsPersistence: false,
        saving: false,
        tab: null,
      },
    });
    expect(guard.needsPersistence.value).toBe(true);
    owner.revision = "3d-save-revision";
    expect(guard.needsPersistence.value).toBe(true);
  });

  it("accepts confirmed clean state after undo or a no-change save without a write receipt", () => {
    const { guard, update } = createGuard();
    update(true);
    update(false);
    expect(guard.needsPersistence.value).toBe(false);
  });

  it("ignores a different object and stale revision before accepting a current update", () => {
    const { guard, update } = createGuard();
    update(true, { editorKey: 8 });
    update(true, { ownerRevision: "old-revision" });
    expect(guard.needsPersistence.value).toBe(false);
    update(true);
    update(false, { ownerRevision: "old-revision" });
    expect(guard.needsPersistence.value).toBe(true);
  });

  it("does not carry requirements into another object, script version or editor session", () => {
    for (const change of [
      { id: 8 },
      { scriptVersion: "new-script" },
      { session: "session-b" },
    ]) {
      const { owner, guard, update } = createGuard();
      update(true);
      Object.assign(owner, change);
      expect(guard.needsPersistence.value).toBe(false);
    }
  });

  it("clears acknowledged scripts and ended editor sessions", () => {
    const { guard, update } = createGuard();
    update(true);
    guard.clear();
    expect(guard.needsPersistence.value).toBe(false);
    update(true);
    guard.clear();
    expect(guard.needsPersistence.value).toBe(false);
  });

  it("versions all persisted script fields while ignoring unrelated object properties", () => {
    expect(
      scriptPersistenceVersion({
        blockly: "{}",
        js: "",
        lua: "",
        name: "renamed",
      })
    ).toBe(scriptPersistenceVersion({ blockly: "{}" }));
    for (const code of [
      { blockly: "new" },
      { blockly: "{}", js: "new()" },
      { blockly: "{}", lua: "new()" },
    ]) {
      expect(scriptPersistenceVersion(code)).not.toBe(
        scriptPersistenceVersion({ blockly: "{}" })
      );
    }
  });
});
