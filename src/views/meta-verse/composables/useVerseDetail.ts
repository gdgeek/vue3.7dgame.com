import { ref, computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { Message } from "@/components/Dialog";
import {
  getVerse,
  putVerse,
  addPublic,
  removePublic,
  addTag,
  removeTag,
} from "@/api/v1/verse";
import { getTags } from "@/api/v1/tags";
import { convertToLocalTime } from "@/utils/utilityFunctions";
import type { VerseData } from "@/api/v1/verse";

interface Options {
  refresh: () => void;
  canManage: Ref<boolean>;
}

export function useVerseDetail({ refresh, canManage }: Options) {
  const { t } = useI18n();

  const detailVisible = ref(false);
  const detailLoading = ref(false);
  const currentVerse = ref<VerseData | null>(null);
  const editingDescription = ref("");
  const allTags = ref<{ label: string; value: number }[]>([]);
  const selectedTag = ref<number | undefined>(undefined);

  const detailProperties = computed(() => {
    if (!currentVerse.value) return [];
    return [
      { label: t("verse.listPage.type"), value: t("verse.listPage.scene") },
      {
        label: t("verse.listPage.author"),
        value:
          currentVerse.value.author?.nickname ||
          currentVerse.value.author?.username ||
          "—",
      },
      {
        label: t("verse.listPage.createdTime"),
        value: currentVerse.value.created_at
          ? convertToLocalTime(currentVerse.value.created_at)
          : "—",
      },
    ];
  });

  const openDetail = async (item: VerseData) => {
    detailVisible.value = true;
    detailLoading.value = true;
    try {
      const response = await getVerse(item.id, "image,author,verseTags");
      currentVerse.value = response.data;
      editingDescription.value = response.data.description || "";
      if (canManage.value) {
        const tagsRes = await getTags();
        allTags.value = tagsRes.data.map(
          (tag: { id: number; name: string }) => ({
            label: tag.name,
            value: tag.id,
          })
        );
      }
    } catch (err) {
      Message.error(String(err));
    } finally {
      detailLoading.value = false;
    }
  };

  const handleDescriptionBlur = async () => {
    if (
      !currentVerse.value ||
      editingDescription.value === (currentVerse.value.description || "")
    )
      return;
    try {
      await putVerse(currentVerse.value.id, {
        description: editingDescription.value,
      });
      currentVerse.value.description = editingDescription.value;
      Message.success(t("verse.listPage.descriptionUpdated"));
      refresh();
    } catch {
      Message.error(t("verse.listPage.descriptionUpdateFailed"));
      editingDescription.value = currentVerse.value.description || "";
    }
  };

  const handlePanelClose = () => {
    currentVerse.value = null;
  };

  const isTagSelected = (tagId: number) => {
    return currentVerse.value?.verseTags?.some((t) => t.id === tagId);
  };

  const handleAddTag = async (tagId: number | undefined) => {
    if (tagId === undefined || !currentVerse.value) return;
    try {
      await addTag(currentVerse.value.id, tagId);
      const tag = allTags.value.find((t) => t.value === tagId);
      if (tag) {
        if (!currentVerse.value.verseTags) currentVerse.value.verseTags = [];
        currentVerse.value.verseTags.push({ id: tag.value, name: tag.label });
      }
      selectedTag.value = undefined;
      Message.success(t("verse.listPage.tagAdded"));
      refresh();
    } catch {
      Message.error(t("verse.listPage.tagAddFailed"));
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!currentVerse.value) return;
    try {
      await removeTag(currentVerse.value.id, tagId);
      currentVerse.value.verseTags =
        currentVerse.value.verseTags?.filter((t) => t.id !== tagId) ?? [];
      Message.success(t("verse.listPage.tagRemoved"));
      refresh();
    } catch {
      Message.error(t("verse.listPage.tagRemoveFailed"));
    }
  };

  const handleVisibilityChange = async (isPublic: boolean) => {
    if (!currentVerse.value || currentVerse.value.public === isPublic) return;
    try {
      if (isPublic) {
        await addPublic(currentVerse.value.id);
      } else {
        await removePublic(currentVerse.value.id);
      }
      currentVerse.value.public = isPublic;
      Message.success(
        isPublic
          ? t("verse.view.public.addSuccess")
          : t("verse.view.public.removeSuccess")
      );
      refresh();
    } catch {
      Message.error(t("verse.listPage.visibilityUpdateFailed"));
    }
  };

  return {
    detailVisible,
    detailLoading,
    currentVerse,
    editingDescription,
    allTags,
    selectedTag,
    detailProperties,
    openDetail,
    handleDescriptionBlur,
    handlePanelClose,
    isTagSelected,
    handleAddTag,
    handleRemoveTag,
    handleVisibilityChange,
  };
}
