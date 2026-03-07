import { ref } from "vue";
import type { Ref } from "vue";
import { useI18n } from "vue-i18n";
import { Message } from "@/components/Dialog";
import { logger } from "@/utils/logger";
import { getMeta, putMeta } from "@/api/v1/meta";
import type { metaInfo } from "@/api/v1/meta";
import { useFileStore } from "@/store/modules/config";
import { postFile } from "@/api/v1/files";
import { getPicture } from "@/api/v1/resources/index";
import type { UploadFileType } from "@/api/user/model";
import type ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import type { CardInfo } from "@/utils/types";

interface UseMetaCoverUploadOptions {
  currentMeta: Ref<metaInfo | null>;
  detailLoading: Ref<boolean>;
  refresh: () => void;
}

export function useMetaCoverUpload({
  currentMeta,
  detailLoading,
  refresh,
}: UseMetaCoverUploadOptions) {
  const { t } = useI18n();
  const fileStore = useFileStore();

  const imageSelectDialogVisible = ref(false);
  const resourceDialogRef = ref<InstanceType<typeof ResourceDialog> | null>(
    null
  );
  const fileInput = ref<HTMLInputElement | null>(null);

  const triggerFileSelect = () => {
    imageSelectDialogVisible.value = true;
  };

  const openLocalUpload = () => {
    imageSelectDialogVisible.value = false;
    fileInput.value?.click();
  };

  const openResourceDialog = () => {
    imageSelectDialogVisible.value = false;
    resourceDialogRef.value?.openIt({ type: "picture" });
  };

  const onResourceSelected = async (data: CardInfo) => {
    const context =
      typeof data.context === "object" && data.context !== null
        ? (data.context as { image_id?: number })
        : undefined;
    const imageId = context?.image_id || data.image?.id || data.id;
    if (imageId && currentMeta.value) {
      detailLoading.value = true;
      try {
        let finalImageId = imageId;
        if (data.type === "picture") {
          const response = await getPicture(data.id);
          finalImageId = response.data.image_id || response.data.file?.id;
        }
        await putMeta(String(currentMeta.value.id), { image_id: finalImageId });
        Message.success(t("meta.metaEdit.image.updateSuccess"));
        const response = await getMeta(currentMeta.value.id, {
          expand: "image,author",
        });
        currentMeta.value = response.data;
        refresh();
      } catch (error) {
        logger.error("Failed to update meta image:", error);
        Message.error(t("meta.metaEdit.image.updateError"));
      } finally {
        detailLoading.value = false;
      }
    }
  };

  const handleCoverUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Message.error(t("meta.list.selectImageFile"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Message.error(t("meta.list.imageTooLarge"));
      return;
    }

    detailLoading.value = true;
    try {
      const md5 = await fileStore.store.fileMD5(file);
      const extension = file.name.substring(file.name.lastIndexOf("."));
      const handler = await fileStore.store.publicHandler();
      const dir = "picture";
      const has = await fileStore.store.fileHas(md5, extension, handler, dir);

      if (!has) {
        await new Promise<void>((resolve, reject) => {
          fileStore.store
            .fileUpload(md5, extension, file, (_p: number) => {}, handler, dir)
            .then(() => resolve())
            .catch(reject);
        });
      }

      const fileData: UploadFileType = {
        filename: file.name,
        md5,
        key: md5 + extension,
        url: fileStore.store.fileUrl(md5, extension, handler, dir),
      };
      const response = await postFile(fileData);
      const imageId = response.data.id;

      if (currentMeta.value) {
        await putMeta(String(currentMeta.value.id), { image_id: imageId });
        Message.success(t("meta.metaEdit.image.updateSuccess"));
        const res = await getMeta(currentMeta.value.id, {
          expand: "image,author",
        });
        currentMeta.value = res.data;
        refresh();
      }
    } catch (error) {
      logger.error("Upload failed", error);
      Message.error(t("meta.metaEdit.image.updateError"));
    } finally {
      detailLoading.value = false;
      target.value = "";
    }
  };

  return {
    imageSelectDialogVisible,
    resourceDialogRef,
    fileInput,
    triggerFileSelect,
    openLocalUpload,
    openResourceDialog,
    onResourceSelected,
    handleCoverUpload,
  };
}
