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

export function useScriptEditorModal() {
  const openScriptEditor = (options: ScriptEditorModalOptions) => {
    currentType.value = options.type;
    currentVerseId.value = options.verseId || 0;
    currentMetaId.value = options.metaId || 0;
    currentTitle.value = options.title || "";
    savedCallback.value = options.onSaved;
    isModalOpen.value = true;
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
    closeScriptEditor,
    handleSaved,
  };
}
