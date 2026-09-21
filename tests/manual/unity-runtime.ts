// Local Vite harness: real host controller + real digest-acquired Unity.
// No login, platform data, WebMCP shim or production route is supplied here.
import { createApp, h, watch } from "vue";
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
          "local renderer = cube:GetComponent(typeof(CS.UnityEngine.Renderer))",
          // CreatePrimitive defaults to the built-in Standard shader, which is not a URP material.
          "local shader = CS.UnityEngine.Shader.Find('Universal Render Pipeline/Lit')",
          "assert(shader ~= nil, 'URP Lit shader must be included in the runtime')",
          "renderer.material = CS.UnityEngine.Material(shader)",
          "renderer.material:SetColor('_BaseColor', CS.UnityEngine.Color(0.15, 0.7, 0.95, 1))",
          "print('[XRUGC acceptance] cube active=' .. tostring(cube.activeInHierarchy) .. ', renderer=' .. tostring(renderer.enabled) .. ', shader=' .. renderer.sharedMaterial.shader.name .. ', mesh=' .. tostring(cube:GetComponent(typeof(CS.UnityEngine.MeshFilter)).sharedMesh))",
          "print('[XRUGC acceptance] scene Lua created and transformed cube')",
        ].join("\n"),
        source: "isolated-runtime-harness",
      }),
      notifyError: (message) => window.alert(message),
    });
    // Opt-in local regression check: perform a real failing request from the
    // controlled runner, rather than manufacturing a protocol error message.
    let resourceProbeStarted = false;
    watch(
      () => bridge.runtimeState.value.stage,
      (stage) => {
        if (
          stage !== "running" ||
          resourceProbeStarted ||
          new URLSearchParams(location.search).get("resourceFailure") !== "1"
        )
          return;
        const runner = document.querySelector<HTMLIFrameElement>(
          'iframe[title="Unity 场景运行器"]'
        )?.contentWindow;
        if (!runner) return;
        resourceProbeStarted = true;
        const target =
          "https://data.7dgame.com/audio/xrugc-missing-resource-acceptance.wav";
        void (runner as Window & typeof globalThis)
          .fetch(`/__xrugc_proxy__?url=${encodeURIComponent(target)}`)
          .catch(() => undefined);
      }
    );
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
            helpClick: "先单击运行画面，使其获得焦点",
            helpRotate: "按住 Alt（Mac：⌥ Option）并用鼠标左键拖动，旋转视角",
            helpZoomPan: "滚轮或触控板双指滚动可缩放；鼠标右键拖动可平移",
          },
        },
      },
    },
  })
);
app.mount("#app");
