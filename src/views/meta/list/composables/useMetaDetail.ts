import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import { logger } from "@/utils/logger";
import { v4 as uuidv4 } from "uuid";
import {
  getMeta,
  putMeta,
  deleteMeta,
  postMeta,
  putMetaCode,
} from "@/api/v1/meta";
import type { metaInfo } from "@/api/v1/meta";

export type MetaEventItem = { title: string; name: string; type: string };

const normalizeEventList = (value: unknown): MetaEventItem[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const title = String(record.title ?? record.name ?? `#${index + 1}`);
    const name = String(record.name ?? "");
    const rawType = record.type;
    return {
      title,
      name,
      type: rawType === null || rawType === undefined ? "" : String(rawType),
    };
  });
};

interface UseMetaDetailOptions {
  refresh: () => void;
  logMetaStructure: (scope: "list" | "detail", payload: unknown) => void;
}

export function useMetaDetail({
  refresh,
  logMetaStructure,
}: UseMetaDetailOptions) {
  const { t } = useI18n();
  const router = useRouter();

  const detailVisible = ref(false);
  const detailLoading = ref(false);
  const currentMeta = ref<metaInfo | null>(null);

  const detailProperties = computed(() => {
    if (!currentMeta.value) return [];
    return [
      {
        label: t("meta.list.properties.type"),
        value: t("meta.list.properties.entity"),
      },
      {
        label: t("meta.list.properties.author"),
        value:
          currentMeta.value.author?.nickname ||
          currentMeta.value.author?.username ||
          "—",
      },
      {
        label: t("meta.list.properties.resources"),
        value: Array.isArray(currentMeta.value.resources)
          ? currentMeta.value.resources.length
          : 0,
      },
    ];
  });

  const eventInputs = computed(() =>
    normalizeEventList(currentMeta.value?.events?.inputs)
  );

  const eventOutputs = computed(() =>
    normalizeEventList(currentMeta.value?.events?.outputs)
  );

  const openDetail = async (item: metaInfo) => {
    detailVisible.value = true;
    detailLoading.value = true;
    try {
      const response = await getMeta(item.id, { expand: "image,author" });
      currentMeta.value = response.data;
      logMetaStructure("detail", response.data);
    } catch (err) {
      Message.error(String(err));
    } finally {
      detailLoading.value = false;
    }
  };

  const handlePanelClose = () => {
    currentMeta.value = null;
  };

  const goToEditor = (item: metaInfo): void => {
    const title = encodeURIComponent(
      t("meta.list.editorTitle", {
        name: item.title || t("meta.list.unnamed"),
      })
    );
    router.push({ path: "/meta/scene", query: { id: item.id, title } });
  };

  const handleGoToEditor = (): void => {
    if (currentMeta.value) {
      // metaInfo 类型在此处触发 TS2589（实例化过深），临时保留 as any。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      goToEditor(currentMeta.value as any);
    }
  };

  const copy = async (id: number, newTitle: string) => {
    try {
      const response = await getMeta(id, { expand: "image,author,metaCode" });
      const meta = response.data;
      const newMeta = {
        title: newTitle,
        uuid: uuidv4(),
        image_id: meta.image_id,
        data: meta.data,
        info: meta.info,
        events: meta.events,
        prefab: meta.prefab,
      };
      const createResponse = await postMeta(newMeta);
      const newMetaId = createResponse.data.id;
      if (meta.metaCode) await putMetaCode(newMetaId, meta.metaCode);
      refresh();
    } catch (error) {
      logger.error("Copy error:", error);
      Message.error(t("meta.copyError"));
    }
  };

  const handleCopy = async () => {
    if (!currentMeta.value) return;
    try {
      const { value } = (await MessageBox.prompt(
        t("meta.prompt.message1"),
        t("meta.prompt.message2"),
        {
          confirmButtonText: t("meta.prompt.confirm"),
          cancelButtonText: t("meta.prompt.cancel"),
          defaultValue: `${currentMeta.value.title}${t(
            "meta.list.copySuffix"
          )}`,
        }
      )) as { value: string };
      await copy(currentMeta.value.id, value);
      Message.success(t("meta.prompt.success") + value);
    } catch {
      Message.info(t("meta.prompt.info"));
    }
  };

  const handleRename = async (newName: string) => {
    if (!currentMeta.value) return;
    try {
      await putMeta(String(currentMeta.value.id), { title: newName });
      currentMeta.value.title = newName;
      refresh();
      Message.success(t("meta.prompt.success") + newName);
    } catch (err) {
      Message.error(String(err));
    }
  };

  const handleDelete = async () => {
    if (!currentMeta.value) return;
    try {
      await MessageBox.confirm(
        t("meta.confirm.message1"),
        t("meta.confirm.message2"),
        {
          confirmButtonText: t("meta.confirm.confirm"),
          cancelButtonText: t("meta.confirm.cancel"),
          type: "warning",
        }
      );
      await deleteMeta(String(currentMeta.value.id));
      detailVisible.value = false;
      refresh();
      Message.success(t("meta.confirm.success"));
    } catch {
      Message.info(t("meta.confirm.info"));
    }
  };

  return {
    detailVisible,
    detailLoading,
    currentMeta,
    detailProperties,
    eventInputs,
    eventOutputs,
    openDetail,
    handlePanelClose,
    goToEditor,
    handleGoToEditor,
    handleCopy,
    handleRename,
    handleDelete,
  };
}
