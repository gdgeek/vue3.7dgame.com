import { useI18n } from "vue-i18n";
import { Message, MessageBox } from "@/components/Dialog";
import { logger } from "@/utils/logger";
import { v4 as uuidv4 } from "uuid";
import {
  getMeta,
  postMeta,
  putMeta,
  deleteMeta,
  putMetaCode,
} from "@/api/v1/meta";
import type { metaInfo } from "@/api/v1/meta";

interface UseMetaActionsOptions {
  refresh: () => void;
}

export function useMetaActions({ refresh }: UseMetaActionsOptions) {
  const { t } = useI18n();

  const generateDefaultName = (prefix: string): string => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
    return `${prefix}_${dateStr}_${timeStr}`;
  };

  const copy = async (id: number, newTitle: string): Promise<void> => {
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

  const addMeta = async (): Promise<void> => {
    try {
      const { value } = (await MessageBox.prompt(
        t("meta.create.namePlaceholder"),
        t("meta.create.title"),
        {
          confirmButtonText: t("common.confirm"),
          cancelButtonText: t("common.cancel"),
          defaultValue: generateDefaultName(t("meta.create.defaultName")),
          inputValidator: (val) =>
            !val || !val.trim() ? t("meta.create.nameRequired") : true,
        }
      )) as { value: string };
      await postMeta({ title: value.trim(), uuid: uuidv4() });
      refresh();
      Message.success(t("meta.create.success"));
    } catch {
      /* User cancelled */
    }
  };

  const copyWindow = async (item: metaInfo): Promise<void> => {
    try {
      const { value } = (await MessageBox.prompt(
        t("meta.prompt.message1"),
        t("meta.prompt.message2"),
        {
          confirmButtonText: t("meta.prompt.confirm"),
          cancelButtonText: t("meta.prompt.cancel"),
          defaultValue: `${item.title}${t("meta.list.copySuffix")}`,
        }
      )) as { value: string };
      await copy(item.id, value);
      Message.success(t("meta.prompt.success") + value);
    } catch {
      Message.info(t("meta.prompt.info"));
    }
  };

  const namedWindow = async (item: metaInfo): Promise<void> => {
    try {
      const { value } = (await MessageBox.prompt(
        t("meta.prompt.message1"),
        t("meta.prompt.message2"),
        {
          confirmButtonText: t("meta.prompt.confirm"),
          cancelButtonText: t("meta.prompt.cancel"),
          defaultValue: item.title,
        }
      )) as { value: string };
      await putMeta(String(item.id), { title: value });
      refresh();
      Message.success(t("meta.prompt.success") + value);
    } catch {
      Message.info(t("meta.prompt.info"));
    }
  };

  const deletedWindow = async (
    item: metaInfo,
    resetLoading: () => void
  ): Promise<void> => {
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
      await deleteMeta(String(item.id));
      refresh();
      Message.success(t("meta.confirm.success"));
    } catch {
      Message.info(t("meta.confirm.info"));
      resetLoading();
    }
  };

  return {
    addMeta,
    copyWindow,
    namedWindow,
    deletedWindow,
  };
}
