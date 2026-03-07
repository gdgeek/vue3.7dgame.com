import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { logger } from "@/utils/logger";
import { Message } from "@/components/Dialog";
import { putVerse } from "@/api/v1/verse";
import { getPicture } from "@/api/v1/resources/index";
import { postFile } from "@/api/v1/files";
import { useFileStore } from "@/store/modules/config";
import type { UploadFileType } from "@/api/user/model";
import type { VerseData } from "@/api/v1/verse";
import type { CardInfo } from "@/utils/types";

interface Options {
  currentVerse: Ref<VerseData | null>;
  detailLoading: Ref<boolean>;
  openDetail: (item: VerseData) => Promise<void>;
}

export function useVerseCoverUpload({
  currentVerse,
  detailLoading,
  openDetail,
}: Options) {
  const { t } = useI18n();
  const fileStore = useFileStore();

  const imageSelectDialogVisible = ref(false);
  const resourceDialogRef = ref<{
    openIt(opts: { type: string }): void;
  } | null>(null);
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
    const imageId =
      (data.context as Record<string, unknown>)?.image_id ||
      data.image?.id ||
      data.id;
    if (imageId && currentVerse.value) {
      detailLoading.value = true;
      try {
        let finalImageId = imageId;
        if (data.type === "picture") {
          const response = await getPicture(data.id);
          finalImageId = response.data.image_id || response.data.file?.id;
        }
        await putVerse(currentVerse.value.id, {
          image_id: finalImageId as number | undefined,
        });
        Message.success(t("verse.view.image.updateSuccess"));
        await openDetail(currentVerse.value);
      } catch (error) {
        logger.error("Failed to update verse image:", error);
        Message.error(t("verse.view.image.updateError"));
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
      Message.error(t("verse.listPage.selectImageFile"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Message.error(t("verse.listPage.imageTooLarge"));
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

      if (currentVerse.value) {
        await putVerse(currentVerse.value.id, { image_id: imageId });
        Message.success(t("verse.view.image.updateSuccess"));
        await openDetail(currentVerse.value);
      }
    } catch (error) {
      logger.error("Upload failed", error);
      Message.error(t("verse.view.image.updateError"));
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
