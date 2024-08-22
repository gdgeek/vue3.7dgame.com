import { defineStore } from "pinia";
import env from "@/environment";

interface InformationState {
  companies: { name: string; url: string }[];
  title: string;
  description: string;
  version: string;
  beian: string;
  logo: string;
}

export const useInfomationStore = defineStore("information", () => {
  // 定义 state
  const companies = computed(() => {
    if (document.domain.toLowerCase().indexOf("u7gm.com") >= 0) {
      return [{ name: "上海游七网络科技有限公司", url: "https://u7gm.com" }];
    }
    return [
      { name: "上海不加班网络科技有限公司", url: "https://bujiaban.com" },
    ];
  });

  const title = ref(env.title());
  const description = ref(env.subtitle());
  // const version = ref("20230412.1");
  const version = ref("202408");
  const beian = ref("沪ICP备15039333号");
  const logo = ref("/media/image/logo.gif");

  return {
    companies,
    title,
    description,
    version,
    beian,
    logo,
  } as unknown as InformationState;
});
