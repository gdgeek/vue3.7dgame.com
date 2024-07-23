// src/stores/useFileStore.ts
import { defineStore } from "pinia";
import cloud from "@/assets/js/file/tencent-cloud";
import server from "@/assets/js/file/server";
import env from "@/environment";

// 定义 store
export const useFileStore = defineStore("fileStore", () => {
  const store = env.useCloud() ? cloud : server;

  return {
    store,
  };
});
