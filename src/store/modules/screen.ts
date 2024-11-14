import { defineStore } from "pinia";

export const useScreenStore = defineStore("screen", () => {
  // 移动端适配
  const isMobile = ref<boolean>(window.innerWidth <= 768);

  // 处理屏幕大小改变
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };

  // 在组件挂载时监听屏幕大小变化
  onMounted(() => {
    window.addEventListener("resize", handleResize);
  });

  // 在组件销毁时移除事件监听器
  onBeforeUnmount(() => {
    window.removeEventListener("resize", handleResize);
  });

  return { isMobile };
});
