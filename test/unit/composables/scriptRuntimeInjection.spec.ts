import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("legacy script preview removal contract", () => {
  const scriptEditorSurfaces = [
    "src/components/MetaScriptEditorModal.vue",
    "src/components/ScriptEditorModal.vue",
    "src/views/meta/script.vue",
    "src/views/verse/script.vue",
  ];

  it("脚本编辑界面不再提供浏览器内测试运行入口或动态执行链", () => {
    scriptEditorSurfaces.forEach((path) => {
      const source = readSource(path);
      expect(source, path).not.toContain("测试运行");
      expect(source, path).not.toContain("new Function(");
      expect(source, path).not.toContain("<ScenePlayer");
      expect(source, path).not.toContain("runArea");
      expect(source, path).not.toContain("buildScriptRuntime(");
      expect(source, path).not.toMatch(
        /\bdefineExpose\s*\(\s*\{\s*run\s*\}\s*\)/
      );
    });
  });

  it("遗留脚本运行时及其生产调用方已彻底删除", () => {
    expect(
      existsSync(resolve(process.cwd(), "src/composables/useScriptRuntime.ts"))
    ).toBe(false);

    const legacyRuntimeConsumers = fg
      .sync("src/**/*.{ts,vue}")
      .filter((path) => readSource(path).includes("buildScriptRuntime("));
    expect(legacyRuntimeConsumers).toEqual([]);
  });

  it("正式 WebGL 场景运行器入口保持可用", () => {
    ["src/views/verse/scene.vue", "src/views/verse/script.vue"].forEach(
      (path) => {
        const source = readSource(path);
        expect(source, path).toContain("UnityPreviewDialog");
        expect(source, path).toContain("useUnityPreviewBridge");
      }
    );
    expect(
      existsSync(
        resolve(process.cwd(), "src/composables/useUnityPreviewBridge.ts")
      )
    ).toBe(true);
  });

  it("场景脚本编辑器初始化不等待 WebGL 预览运行时数据", () => {
    const source = readSource("src/views/verse/script.vue");
    const sessionStart = source.indexOf("const loadVerseScriptSession");
    const sessionEnd = source.indexOf("onMounted(loadVerseScriptSession)");
    const sessionSource = source.slice(sessionStart, sessionEnd);
    const previewStart = source.indexOf("const ensureUnityPreviewRuntimeData");
    const previewEnd = source.indexOf("const buildUnityPreviewPayload");
    const previewSource = source.slice(previewStart, previewEnd);

    expect(sessionStart).toBeGreaterThan(-1);
    expect(sessionEnd).toBeGreaterThan(sessionStart);
    expect(sessionSource).toContain("beginEditorSession(");
    expect(sessionSource).toContain("initEditor();");
    expect(sessionSource).not.toContain("UNITY_PREVIEW_VERSE_EXPAND");

    expect(previewStart).toBeGreaterThan(-1);
    expect(previewEnd).toBeGreaterThan(previewStart);
    expect(previewSource).toContain("UNITY_PREVIEW_VERSE_EXPAND");
    expect(previewSource).toContain("loadMetaJavaScriptCode(");
  });
});
