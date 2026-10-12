import { computed, ref } from "vue";
import type { ScriptDrawerStateChange } from "@/components/script-drawer-types";

type ScriptPersistenceOwner = {
  id: number | null;
  revision: string | null;
  scriptVersion: string;
  session: string | null;
};

export const scriptPersistenceVersion = (code: unknown): string => {
  const value =
    code && typeof code === "object" ? (code as Record<string, unknown>) : {};
  return JSON.stringify({
    blockly: value.blockly ?? "",
    lua: value.lua ?? "",
    js: value.js ?? "",
  });
};

/** Retain script persistence requirements when the drawer destroys its editor. */
export function useScriptPersistenceGuard(
  getOwner: () => ScriptPersistenceOwner
) {
  const cached = ref<
    (ScriptPersistenceOwner & { needsPersistence: boolean }) | null
  >(null);
  const needsPersistence = computed(() => {
    const owner = getOwner();
    const previous = cached.value;
    // 3D-only saves advance the object revision without persisting generated code.
    // The script contents and editor session identify the cached requirement.
    return Boolean(
      previous?.needsPersistence &&
        previous.id === owner.id &&
        previous.scriptVersion === owner.scriptVersion &&
        previous.session === owner.session
    );
  });
  const update = (change: ScriptDrawerStateChange) => {
    if (!change.state.ready) return;
    const owner = getOwner();
    if (
      owner.id === null ||
      change.editorKey !== owner.id ||
      change.ownerRevision !== owner.revision
    )
      return;
    cached.value = {
      ...owner,
      needsPersistence: Boolean(change.state.needsPersistence),
    };
  };
  return {
    needsPersistence,
    update,
    clear: () => {
      cached.value = null;
    },
  };
}
