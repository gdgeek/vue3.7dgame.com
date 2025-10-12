import { ref, onMounted, onUnmounted } from 'vue';

/** Manage two fullscreen contexts: editor area and scene area. */
export function useFullscreen() {
  const isFullscreen = ref(false);
  const isSceneFullscreen = ref(false);

  const request = (el: Element) => {
    if (!document.fullscreenElement) el.requestFullscreen?.();
  };
  const exit = () => {
    if (document.fullscreenElement) document.exitFullscreen();
  };

  const toggleEditor = (container?: HTMLElement | null) => {
    if (!document.fullscreenElement) {
      if (container) request(container);
      isFullscreen.value = true;
    } else {
      exit();
      isFullscreen.value = false;
    }
  };

  const toggleScene = (container?: HTMLElement | null) => {
    if (!document.fullscreenElement) {
      if (container) request(container);
      isSceneFullscreen.value = true;
    } else {
      exit();
      isSceneFullscreen.value = false;
    }
  };

  const syncState = () => {
    const active = !!document.fullscreenElement;
    // 如果退出全屏，同时都置为 false；进入时保持原控制路径
    if (!active) {
      isFullscreen.value = false;
      isSceneFullscreen.value = false;
    }
  };

  onMounted(() => {
    document.addEventListener('fullscreenchange', syncState);
  });
  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', syncState);
  });

  return { isFullscreen, isSceneFullscreen, toggleEditor, toggleScene };
}
