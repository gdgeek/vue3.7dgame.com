// Local Vite harness: real host controller + real digest-acquired Unity.
// No login, platform data, WebMCP shim or production route is supplied here.
import { createApp, h } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "uno.css";
import { createI18n } from "vue-i18n";
import UnityPreviewDialog from "../../src/components/UnityPreviewDialog.vue";
import { useUnityPreviewBridge } from "../../src/composables/useUnityPreviewBridge";

const app = createApp({
  setup() {
    const bridge = useUnityPreviewBridge({
      buildPayload: () => ({
        id: 1,
        name: "主站 Unity 隔离运行器检查",
        uuid: "00000000-0000-4000-8000-000000000001",
        data: { modules: [] },
        metas: [],
        resources: [],
        code: [
          "local cube = CS.UnityEngine.GameObject.CreatePrimitive(CS.UnityEngine.PrimitiveType.Cube)",
          "cube.name = 'XRUGC acceptance cube'",
          "cube.transform.position = CS.UnityEngine.Vector3(0, 1, 0)",
          "cube.transform.localScale = CS.UnityEngine.Vector3(1, 2, 1)",
          "print('[XRUGC acceptance] scene Lua created and transformed cube')",
        ].join("\n"),
        source: "isolated-runtime-harness",
      }),
      notifyError: (message) => window.alert(message),
    });
    return () =>
      h("main", { style: "font:16px system-ui;padding:24px" }, [
        h("h1", "主站 Unity 独立运行验收"),
        h(
          "p",
          "此本地页面使用真实主站控制器和 Unity 制品，通过自带 Lua 创建立方体。只验证运行器，不代表专用业务场景或原生 WebMCP 验收。"
        ),
        h("button", { onClick: bridge.open }, "启动运行器"),
        h("button", { onClick: bridge.close }, "停止运行器"),
        h(
          "pre",
          { id: "runtime-state", style: "white-space:pre-wrap" },
          JSON.stringify(bridge.runtimeState.value, null, 2)
        ),
        h(UnityPreviewDialog, {
          ref: bridge.dialogRef,
          modelValue: bridge.visible.value,
          frameVisible: bridge.frameVisible.value,
          frameKey: bridge.frameKey.value,
          src: bridge.src.value,
          state: bridge.runtimeState.value,
          onClose: bridge.close,
          onRetry: bridge.retry,
          onFrameLoad: bridge.handleLoad,
        }),
      ]);
  },
});
app.use(ElementPlus);
app.use(
  createI18n({
    legacy: false,
    locale: "zh-CN",
    messages: {
      "zh-CN": {
        common: {
          unityPreview: {
            title: "运行场景",
            close: "关闭运行场景",
            helpClick: "点击与场景交互",
            helpRotate: "拖动旋转视角",
            helpZoomPan: "滚轮缩放",
          },
        },
      },
    },
  })
);
app.mount("#app");
