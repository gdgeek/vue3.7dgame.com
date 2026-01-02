import { defineStore } from "pinia";
import env from "@/environment";
import i18n from "@/lang";

interface InformationState {
  //companies: { name: string; url: string }[]; //公司
  title: string; //标题
  description: string; //声明
  //version: string; //版本号
  //  beian: string; // 备案
  // privacyPolicy: { name: string; url: string }; //私有协议
  // logo: string; //logo
}

export const useInfomationStore = defineStore("information", () => {
  const lang = ref(i18n.global.locale.value);
  const companies = computed(() => {
    if (document.domain.toLowerCase().indexOf("u7gm.com") >= 0) {
      // return [{ name: "上海游七网络科技有限公司", url: "https://u7gm.com" }];
      if (lang.value === "zh-CN") {
        return [{ name: "上海游七网络科技有限公司", url: "https://u7gm.com" }];
      } else if (lang.value === "ja-JP") {
        return [
          {
            name: "上海遊七ネットワーク技術有限公司",
            url: "https://u7gm.com",
          },
        ];
      } else {
        return [
          {
            name: "Shanghai U7 Game Network Technology Co., Ltd.",
            url: "https://u7gm.com",
          },
        ];
      }
    }
    if (lang.value === "zh-CN") {
      return [
        { name: "上海不加班网络科技有限公司", url: "https://bujiaban.com" },
      ];
    } else if (lang.value === "ja-JP") {
      return [
        {
          name: "上海残業なしネットワーク技術有限公司",
          url: "https://bujiaban.com",
        },
      ];
    } else {
      return [
        {
          name: "Shanghai No Overwork Network Technology Co., Ltd.",
          url: "https://bujiaban.com",
        },
      ];
    }
  });

  //const title = ref(env.title());
  const description = ref(env.subtitle());
  // const version = ref("20230412.1");
  //const version = ref("2025");
  // const beian = ref("沪ICP备15039333号");
  /*onst beian = computed(() => {
    if (lang.value === "zh-CN") {
      return "沪ICP备15039333号";
    } else if (lang.value === "ja-JP") {
      return "沪ICP登録番号15039333号";
    } else {
      return "ICP License No.15039333";
    }
  });
  const privacyPolicy = computed(() => {
    if (lang.value === "zh-CN") {
      return { name: "隐私政策", url: "/privacy-policy" };
    } else if (lang.value === "ja-JP") {
      return { name: "プライバシーポリシー", url: "/privacy-policy" };
    } else {
      return { name: "Privacy Policy", url: "/privacy-policy" };
    }
  });*/
  //const logo = ref("/media/image/logo.gif");

  // 监听语言环境变化
  watch(
    () => i18n.global.locale.value,
    (newLang) => {
      lang.value = newLang;
    }
  );

  return {
    //companies,
    description,
    //beian,
    //privacyPolicy,
    // logo,
  } as unknown as InformationState;
});
