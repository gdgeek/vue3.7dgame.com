import { ref } from "vue";
import { logger } from "@/utils/logger";
import type { Verse, Entity } from "@/types/verse";
import type { ModuleParameters, VerseMetaInfo } from "../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isVerseMetaInfo = (value: unknown): value is VerseMetaInfo =>
  isRecord(value) && ("id" in value || "data" in value || "events" in value);

export function useVerseMode(verse: Verse | undefined) {
  const eventContainer = ref<Record<string, unknown>>({});

  const parseVerseData = (): { children?: { modules?: Entity[] } } | null => {
    if (!verse?.data) return null;
    if (typeof verse.data === "string") {
      try {
        return JSON.parse(verse.data) as { children?: { modules?: Entity[] } };
      } catch (error) {
        logger.error("[ScenePlayer] Failed to parse verse data:", error);
        return null;
      }
    }
    return verse.data as { children?: { modules?: Entity[] } };
  };

  const initEventContainer = () => {
    const verseData = parseVerseData();
    if (!verseData?.children?.modules) return;

    verseData.children.modules.forEach((module) => {
      const moduleParams = module.parameters as ModuleParameters | undefined;
      if (!moduleParams?.meta_id || !moduleParams.uuid) return;

      const meta = verse!.metas.find(
        (candidate): candidate is VerseMetaInfo =>
          isVerseMetaInfo(candidate) &&
          String((candidate as VerseMetaInfo).id) ===
            String(moduleParams.meta_id)
      );

      if (meta?.events) {
        try {
          eventContainer.value[moduleParams.uuid] = meta.events;
          logger.log(
            `[ScenePlayer] Module ${moduleParams.uuid} events loaded:`,
            meta.events
          );
        } catch (error) {
          logger.error(
            `[ScenePlayer] Failed to parse Module ${moduleParams.uuid} events:`,
            error
          );
        }
      }
    });
  };

  return {
    eventContainer,
    parseVerseData,
    initEventContainer,
    isVerseMetaInfo,
  };
}
