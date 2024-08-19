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
  // 使用 ref 定义状态
  const tagsMap = ref<Map<number, TagInfo> | null>(null);

  // 定义刷新标签的方法
  const refreshTags = async () => {
    try {
      const response = await getTags();
      const map = new Map<number, TagInfo>();
      response.data.forEach((item: any) => {
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
      console.error(error);
    }
  };

  return {
    tagsMap,
    refreshTags,
  };
});
