import { ref } from "vue";

interface ScriptEditorModalOptions {
  verseId?: number;
  metaId?: number;
  type: "verse" | "meta";
  title?: string;
  onSaved?: () => void;
}

const isModalOpen = ref(false);
const currentVerseId = ref<number>(0);
const currentMetaId = ref<number>(0);
const currentType = ref<"verse" | "meta">("verse");
const currentTitle = ref<string>("");
const savedCallback = ref<(() => void) | undefined>();
type PendingOpenRequest = ScriptEditorModalOptions & {
  resolve: (opened: boolean) => void;
};
const pendingOpenRequest = ref<PendingOpenRequest | null>(null);
const switchRequestToken = ref(0);

const applyOpenOptions = (options: ScriptEditorModalOptions) => {
  currentType.value = options.type;
  currentVerseId.value = options.verseId || 0;
  currentMetaId.value = options.metaId || 0;
  currentTitle.value = options.title || "";
  savedCallback.value = options.onSaved;
  isModalOpen.value = true;
};

export function useScriptEditorModal() {
  const openScriptEditor = (options: ScriptEditorModalOptions) => {
    if (isModalOpen.value) {
      pendingOpenRequest.value?.resolve(false);
      return new Promise<boolean>((resolve) => {
        pendingOpenRequest.value = { ...options, resolve };
        switchRequestToken.value += 1;
      });
    }
    applyOpenOptions(options);
    return Promise.resolve(true);
  };

  const acceptPendingScriptEditor = () => {
    const pending = pendingOpenRequest.value;
    if (!pending) return false;
    pendingOpenRequest.value = null;
    applyOpenOptions(pending);
    pending.resolve(true);
    return true;
  };

  const rejectPendingScriptEditor = () => {
    const pending = pendingOpenRequest.value;
    if (!pending) return false;
    pendingOpenRequest.value = null;
    pending.resolve(false);
    return true;
  };

  const closeScriptEditor = () => {
    isModalOpen.value = false;
  };

  const handleSaved = () => {
    if (savedCallback.value) {
      savedCallback.value();
    }
  };

  return {
    isModalOpen,
    currentVerseId,
    currentMetaId,
    currentType,
    currentTitle,
    openScriptEditor,
    pendingOpenRequest,
    switchRequestToken,
    acceptPendingScriptEditor,
    rejectPendingScriptEditor,
    closeScriptEditor,
    handleSaved,
  };
}
