import { logger } from "@/utils/logger";
import { defineStore } from "pinia";
import { ref } from "vue";
import { getTags } from "@/api/v1/tags";

export type TagInfo = {
  name: string;
  color: string;
  type: string;
  explan: string;
  managed: 0 | 1;
};

export const useTagsStore = defineStore("tags", () => {
  const tagsMap = ref<Map<number, TagInfo> | null>(null);

  // 刷新标签
  const refreshTags = async () => {
    try {
      const classify = await getTags("Classify");

      const map = new Map<number, TagInfo>();
      classify.data.forEach((item: any) => {
        const obj: TagInfo = {
          name: item.name,
          color: "#000000",
          type: "#000000",
          explan: "无内容",
          managed: item.managed,
        };
        const info = JSON.parse(item.info);
        if (info) {
          obj.color = info.color || "#000000";
          obj.type = info.type || "#000000";
          obj.explan = info.explan || "无内容";
        }
        map.set(item.id, obj);
      });
      tagsMap.value = map;
    } catch (error) {
      logger.error(error);
    }
  };

  return {
    tagsMap,
    refreshTags,
  };
});
