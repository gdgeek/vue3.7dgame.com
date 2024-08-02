import { defineStore } from "pinia";

interface BreadcrumbItem {
  path: string;
  meta: {
    title: string;
  };
}

export const useBreadcrumbStore = defineStore("BreadcrumbStore", () => {
  const list = ref<BreadcrumbItem[]>([]);

  const setBreadcrumbs = (newlist: BreadcrumbItem[]) => {
    list.value = newlist;
  };

  return {
    list,
    setBreadcrumbs,
    namespaced: true,
  };
});
