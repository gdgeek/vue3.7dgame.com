import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { logger } from "@/utils/logger";
import { v4 as uuidv4 } from "uuid";
import { Message, MessageBox } from "@/components/Dialog";
import { postVerse, putVerse, deleteVerse } from "@/api/v1/verse";
import { exportScene } from "@/services/scene-package/export-service";
import type { VerseData, PostVerseData } from "@/api/v1/verse";

interface Options {
  refresh: () => void;
  currentVerse: Ref<VerseData | null>;
  detailVisible: Ref<boolean>;
}

export function useVerseCrud({
  refresh,
  currentVerse,
  detailVisible,
}: Options) {
  const { t } = useI18n();
  const router = useRouter();

  const createdDialog = ref<{ show(): void } | null>(null);
  const importDialogVisible = ref(false);

  const formatItemDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const goToEditor = (item: VerseData) => {
    const title = encodeURIComponent(
      t("verse.listPage.editorTitle", {
        name: item.name || t("verse.listPage.unnamed"),
      })
    );
    router.push({ path: "/verse/scene", query: { id: item.id, title } });
  };

  const handleGoToEditor = () => {
    if (currentVerse.value) goToEditor(currentVerse.value);
  };

  const createWindow = () => {
    createdDialog.value?.show();
  };

  const submitCreate = async (
    form: Record<string, string>,
    imageId: number | null
  ) => {
    const data: PostVerseData = {
      name: form.name,
      description: form.description,
      uuid: uuidv4(),
    };
    if (imageId !== null) data.image_id = imageId;
    try {
      const response = await postVerse(data);
      const title = encodeURIComponent(
        t("verse.listPage.editorTitle", { name: form.name })
      );
      router.push({
        path: "/verse/scene",
        query: { id: response.data.id, title },
      });
    } catch (error) {
      logger.error(error);
    }
  };

  const namedWindow = async (item: VerseData) => {
    try {
      const { value } = (await MessageBox.prompt(
        t("meta.prompt2.message1"),
        t("meta.prompt2.message2"),
        {
          confirmButtonText: t("common.confirm"),
          cancelButtonText: t("common.cancel"),
          defaultValue: item.name,
        }
      )) as { value: string };
      await putVerse(item.id, { name: value });
      refresh();
      Message.success(t("verse.listPage.renameSuccess") + value);
    } catch {
      Message.info(t("verse.listPage.cancelInfo"));
    }
  };

  const deletedWindow = async (item: VerseData) => {
    try {
      await MessageBox.confirm(
        t("verse.listPage.deleteConfirmMessage"),
        t("verse.listPage.deleteConfirmTitle"),
        {
          confirmButtonText: t("verse.listPage.delete"),
          cancelButtonText: t("common.cancel"),
          type: "warning",
        }
      );
      await deleteVerse(item.id);
      refresh();
      Message.success(t("common.deleteSuccess"));
    } catch {
      Message.info(t("verse.listPage.cancelInfo"));
    }
  };

  const handleExport = async () => {
    if (!currentVerse.value) return;
    try {
      await exportScene(currentVerse.value.id);
      Message.success(t("ui.exportSuccess"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("ui.unknownError");
      Message.error(t("ui.exportFailed", { message }));
    }
  };

  const handleRename = async (newName: string) => {
    if (!currentVerse.value) return;
    try {
      await putVerse(currentVerse.value.id, { name: newName });
      currentVerse.value.name = newName;
      refresh();
      Message.success(t("verse.listPage.renameSuccess") + newName);
    } catch (err) {
      Message.error(String(err));
    }
  };

  const handleDelete = async () => {
    if (!currentVerse.value) return;
    try {
      await MessageBox.confirm(
        t("verse.listPage.deleteConfirmMessage"),
        t("verse.listPage.deleteConfirmTitle"),
        {
          confirmButtonText: t("verse.listPage.delete"),
          cancelButtonText: t("common.cancel"),
          type: "warning",
        }
      );
      await deleteVerse(currentVerse.value.id);
      detailVisible.value = false;
      refresh();
      Message.success(t("common.deleteSuccess"));
    } catch {
      Message.info(t("verse.listPage.cancelInfo"));
    }
  };

  const openImportDialog = () => {
    importDialogVisible.value = true;
  };

  const handleImportSuccess = (_verseId: number) => {
    importDialogVisible.value = false;
    refresh();
    Message.success(t("verse.listPage.importSuccess"));
  };

  return {
    createdDialog,
    importDialogVisible,
    formatItemDate,
    goToEditor,
    handleGoToEditor,
    createWindow,
    submitCreate,
    namedWindow,
    deletedWindow,
    handleExport,
    handleRename,
    handleDelete,
    openImportDialog,
    handleImportSuccess,
  };
}
