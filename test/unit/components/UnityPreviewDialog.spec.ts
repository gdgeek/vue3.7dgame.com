import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, type App } from "vue";
import UnityPreviewDialog from "@/components/UnityPreviewDialog.vue";
import type { UnityRuntimeViewState } from "@/services/unity/runtime";

vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

let app: App<Element> | undefined;
let target: HTMLDivElement;
afterEach(() => {
  app?.unmount();
  target?.remove();
});

const mountPreview = (state?: UnityRuntimeViewState, frameVisible = true) => {
  const onClose = vi.fn();
  const onRetry = vi.fn();
  target = document.createElement("div");
  document.body.append(target);
  app = createApp(UnityPreviewDialog, {
    modelValue: true,
    frameVisible,
    frameKey: 1,
    src: "about:blank",
    state,
    onClose,
    onRetry,
  });
  app.component(
    "el-dialog",
    defineComponent({
      props: { width: String },
      setup(props, { slots }) {
        return () =>
          h("section", { role: "dialog", "data-width": props.width }, [
            slots.header?.({
              titleId: "preview-title",
              titleClass: "preview-title",
            }),
            slots.default?.(),
          ]);
      },
    })
  );
  app.component(
    "el-tooltip",
    defineComponent({
      setup(_, { slots }) {
        return () => h("span", [slots.default?.(), slots.content?.()]);
      },
    })
  );
  app.component(
    "el-icon",
    defineComponent({
      setup(_, { slots }) {
        return () => h("span", slots.default?.());
      },
    })
  );
  return { exposed: app.mount(target), onClose, onRetry };
};

const stateFor = (
  stage: UnityRuntimeViewState["stage"]
): UnityRuntimeViewState => ({
  stage,
  status:
    stage === "stopping"
      ? "正在停止 Unity 并释放资源"
      : "正在准备场景与运行器版本",
  progress: { kind: "bytes", loaded: 1024, total: 4096, artifact: "wasm" },
  failure: null,
  sessionId: "raw-session-id",
  runtimeReleaseId: "raw-release-id",
  buildId: "raw-build-id",
  evidence: null,
  elapsedSeconds: 73,
});

describe("Unity preview modal", () => {
  it("keeps the bounded modal iframe and exposes no fullscreen action or API", () => {
    const { exposed, onClose } = mountPreview();
    const modal = target.querySelector('[role="dialog"]');
    expect(modal?.getAttribute("data-width")).toBe(
      "min(1120px, calc(100vw - 64px))"
    );
    const iframe = modal?.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("allow")).toContain("fullscreen 'none'");
    expect(iframe?.hasAttribute("allowfullscreen")).toBe(false);
    expect(target.querySelector('[aria-label*="fullscreen" i]')).toBeNull();
    expect(target.textContent).not.toContain("helpFullscreen");
    expect(target.textContent).toContain("helpRotate");
    expect("toggleFullscreen" in exposed).toBe(false);
    expect("requestFullscreen" in exposed).toBe(false);
    target
      .querySelector<HTMLButtonElement>(
        '[aria-label="common.unityPreview.close"]'
      )
      ?.click();
    expect(onClose).toHaveBeenCalledOnce();
    // The owner keeps the iframe mounted until bounded Quit has completed.
    expect(target.querySelector("iframe")).not.toBeNull();
  });

  it.each(["downloading_runtime", "running"] as const)(
    "lets the iframe render %s without a duplicate outer progress or retry control",
    (stage) => {
      mountPreview(stateFor(stage));
      expect(target.querySelector("iframe")).not.toBeNull();
      expect(
        target.querySelector(
          "progress, details, .unity-preview-retry, .unity-preview-feedback"
        )
      ).toBeNull();
      expect(target.textContent).not.toContain("73 秒");
      expect(target.textContent).not.toContain("raw-session-id");
      expect(target.textContent).not.toContain("raw-release-id");
      expect(target.textContent).not.toContain("raw-build-id");
    }
  );

  it.each(["preparing", "stopping"] as const)(
    "shows a clear %s placeholder when the iframe is unavailable",
    (stage) => {
      const state = stateFor(stage);
      mountPreview(state, false);
      expect(target.querySelector('[role="status"]')?.textContent).toContain(
        state.status
      );
      expect(target.querySelector("iframe, .unity-preview-retry")).toBeNull();
    }
  );

  it.each([false, true])(
    "offers error recovery without rendering raw diagnostics (iframe still mounted: %s)",
    (frameVisible) => {
      const state = stateFor("error");
      state.failure = {
        code: "SCENE_ASSET_ORIGIN_DENIED",
        stage: "preparing",
        message: "long runtime policy details",
      };
      const { onRetry } = mountPreview(state, frameVisible);
      expect(target.querySelector('[role="status"]')?.textContent).toContain(
        "当前场景资源来源暂不支持"
      );
      expect(target.textContent).not.toContain(state.failure.message);
      expect(target.textContent).not.toContain("SCENE_ASSET_ORIGIN_DENIED");
      expect(target.textContent).not.toContain("raw-session-id");
      expect(target.querySelector("details, progress")).toBeNull();
      target.querySelector<HTMLButtonElement>(".unity-preview-retry")?.click();
      expect(onRetry).toHaveBeenCalledOnce();
      expect(Boolean(target.querySelector("iframe"))).toBe(frameVisible);
    }
  );
});
