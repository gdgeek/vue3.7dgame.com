import { computed, ref, shallowRef, type Ref } from "vue";
import type { SubtitleCue } from "@/utils/audioSubtitles";

type Entry = {
  state: Array<{ target: SubtitleCue; value: SubtitleCue }>;
  signature: string;
};

/** Local draft history; stable cue references also retain row focus and identity. */
export function useSubtitleHistory(cues: Ref<SubtitleCue[]>) {
  const entries = shallowRef<Entry[]>([]);
  const position = ref(-1);
  let lastGroup: string | undefined;
  let lastChange = 0;
  const canUndo = computed(() => position.value > 0);
  const canRedo = computed(
    () => position.value >= 0 && position.value < entries.value.length - 1
  );
  function capture(): Entry {
    return {
      state: cues.value.map((cue) => ({ target: cue, value: { ...cue } })),
      // Preserve invalid numeric drafts in history; JSON's default NaN -> null loses intent.
      signature: JSON.stringify(cues.value, (_key, value) =>
        typeof value === "number" && !Number.isFinite(value)
          ? `@${value}`
          : value
      ),
    };
  }
  function endGroup() {
    lastGroup = undefined;
  }
  function reset() {
    entries.value = [capture()];
    position.value = 0;
    endGroup();
  }
  function record(group?: string) {
    const entry = capture();
    if (entry.signature === entries.value[position.value]?.signature) return;
    const now = Date.now();
    const merge =
      group !== undefined &&
      group === lastGroup &&
      now - lastChange < 750 &&
      position.value > 0 &&
      position.value === entries.value.length - 1;
    const next = entries.value.slice(0, position.value + 1);
    if (merge) next[next.length - 1] = entry;
    else next.push(entry);
    let size = next.reduce((sum, item) => sum + item.signature.length, 0);
    // Bound memory as well as steps, keeping at least one undo for a large import.
    while (next.length > 2 && (next.length > 100 || size > 2_000_000))
      size -= next.shift()!.signature.length;
    entries.value = next;
    position.value = next.length - 1;
    lastGroup = group;
    lastChange = now;
  }
  function apply(index: number) {
    const entry = entries.value[index];
    if (!entry) return;
    cues.value = entry.state.map(({ target, value }) => {
      Object.assign(target, value);
      if (value.translation === undefined) delete target.translation;
      return target;
    });
    position.value = index;
    endGroup();
  }
  function undo() {
    if (canUndo.value) apply(position.value - 1);
  }
  function redo() {
    if (canRedo.value) apply(position.value + 1);
  }
  function acceptNormalization() {
    const next = entries.value.slice();
    next[position.value] = capture();
    entries.value = next;
    endGroup();
  }
  reset();
  return {
    canUndo,
    canRedo,
    record,
    reset,
    undo,
    redo,
    endGroup,
    acceptNormalization,
  };
}
