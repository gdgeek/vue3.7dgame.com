import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("script runtime injection contract", () => {
  it("所有 buildScriptRuntime 执行入口都使用统一参数名和实参数组", () => {
    const runtimeConsumers = fg
      .sync("src/**/*.{ts,vue}")
      .filter((path) => path !== "src/composables/useScriptRuntime.ts")
      .filter((path) => readSource(path).includes("buildScriptRuntime("));

    expect(runtimeConsumers.sort()).toEqual(
      [
        "src/components/ScriptEditorModal.vue",
        "src/views/meta/script.vue",
        "src/views/verse/script.vue",
      ].sort()
    );
    runtimeConsumers.forEach((path) => {
      const source = readSource(path);
      expect(source, path).toContain("SCRIPT_RUNTIME_BINDING_NAMES");
      expect(source, path).toContain("getScriptRuntimeBindingValues(runtime)");
    });
  });

  it("三个预览入口的 handlePolygen 均同步返回 mesh wrapper", () => {
    [
      "src/components/ScriptEditorModal.vue",
      "src/views/meta/script.vue",
      "src/views/verse/script.vue",
    ].forEach((path) => {
      const source = readSource(path);
      expect(source, path).toContain("const handlePolygen = (uuid: string)");
      expect(source, path).not.toContain(
        "const handlePolygen = async (uuid: string)"
      );
      expect(source, path).toContain("mesh: model");
    });
  });

  it("meta/verse 的 handlePolygen 会将异步重试结果回传到稳定句柄", () => {
    ["src/views/meta/script.vue", "src/views/verse/script.vue"].forEach(
      (path) => {
        const source = readSource(path);
        expect(source, path).toContain("resolveWithRetry(");
        expect(source, path).toContain("delayedModelData = resolvedModelData");
        expect(source, path).toContain("get mesh() {");
        expect(source, path).not.toContain(
          "setTimeout(() => getModel(uuid, retries - 1), 100)"
        );
      }
    );
  });
});
