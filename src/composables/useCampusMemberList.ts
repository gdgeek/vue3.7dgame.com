import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import { usePageData } from "@/composables/usePageData";
import type { UsePageDataOptions } from "@/composables/usePageData";

export interface MemberBase {
  id: number;
  user?: {
    nickname?: string;
    username?: string;
    avatar?: { url: string };
  };
  school?: { name: string };
}

export interface CampusMemberListOptions<T extends MemberBase> {
  fetchFn: UsePageDataOptions<T>["fetchFn"];
  deleteFn: (id: number) => Promise<unknown>;
  addPendingKey: string;
  removeConfirmKey: string;
  detailPropertiesFn: (
    item: T,
    t: (key: string) => string
  ) => Array<{ label: string; value: string }>;
}

export function useCampusMemberList<T extends MemberBase>(
  options: CampusMemberListOptions<T>
) {
  const { t } = useI18n();

  const pageData = usePageData<T>({ fetchFn: options.fetchFn });

  const detailVisible = ref(false);
  const detailLoading = ref(false);
  const currentMember = ref<T | null>(null);

  const detailProperties = computed(() => {
    if (!currentMember.value) return [];
    return options.detailPropertiesFn(currentMember.value, t);
  });

  const openDetail = (item: T) => {
    currentMember.value = item;
    detailVisible.value = true;
  };

  const handlePanelClose = () => {
    currentMember.value = null;
  };

  const addMember = () => {
    Message.info(t(options.addPendingKey));
  };

  const handleDelete = async () => {
    if (!currentMember.value) return;
    try {
      await MessageBox.confirm(
        t(options.removeConfirmKey),
        t("manager.ui.removeConfirmTitle"),
        { type: "warning" }
      );
      await options.deleteFn(currentMember.value.id);
      detailVisible.value = false;
      pageData.refresh();
      Message.success(t("manager.messages.removeSuccess"));
    } catch {}
  };

  const deletedWindow = async (item: T) => {
    try {
      await MessageBox.confirm(
        t(options.removeConfirmKey),
        t("manager.ui.removeConfirmTitle"),
        { type: "warning" }
      );
      await options.deleteFn(item.id);
      pageData.refresh();
      Message.success(t("manager.messages.removeSuccess"));
    } catch {}
  };

  return {
    ...pageData,
    detailVisible,
    detailLoading,
    currentMember,
    detailProperties,
    openDetail,
    handlePanelClose,
    addMember,
    handleDelete,
    deletedWindow,
  };
}
