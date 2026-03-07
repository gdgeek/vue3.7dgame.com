import { logger } from "@/utils/logger";
import { getMetas } from "@/api/v1/meta";
import { usePageData } from "@/composables/usePageData";

export const logMetaStructure = (
  scope: "list" | "detail",
  payload: unknown
): void => {
  if (!payload || typeof payload !== "object") {
    logger.info("[MetaStructure]", { scope, payloadType: typeof payload });
    return;
  }

  if (scope === "list") {
    const list = Array.isArray(payload) ? payload : [];
    const first = list[0] as Record<string, unknown> | undefined;
    logger.info("[MetaStructure]", {
      scope,
      count: list.length,
      firstItemKeys: first ? Object.keys(first) : [],
      firstItemRaw: first ?? null,
      firstItemShape: first
        ? {
            idType: typeof first.id,
            titleType: typeof first.title,
            hasAuthor: !!first.author,
            hasImage: !!first.image,
            dataType: typeof first.data,
            infoType: typeof first.info,
            eventsType: typeof first.events,
            metaCodeType: typeof first.metaCode,
          }
        : null,
    });
    return;
  }

  const detail = payload as Record<string, unknown>;
  logger.info("[MetaStructure]", {
    scope,
    keys: Object.keys(detail),
    detailRaw: detail,
    shape: {
      idType: typeof detail.id,
      titleType: typeof detail.title,
      hasAuthor: !!detail.author,
      hasImage: !!detail.image,
      dataType: typeof detail.data,
      infoType: typeof detail.info,
      eventsType: typeof detail.events,
      prefabType: typeof detail.prefab,
      metaCodeType: typeof detail.metaCode,
    },
  });
};

export const getResourceCount = (item?: { resources?: unknown }): number => {
  return Array.isArray(item?.resources) ? item.resources.length : 0;
};

export function useMetaList() {
  const pageData = usePageData({
    fetchFn: async (params) => {
      const response = await getMetas(
        params.sort,
        params.search,
        params.page,
        "image,author,resources"
      );
      logMetaStructure("list", response.data);
      return response;
    },
  });

  return {
    ...pageData,
    getResourceCount,
  };
}
