import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { webMcpGuides } from "../../../build/vite-plugin-webmcp-guides";
import {
  WORKFLOW_GUIDE_INDEX_PATH,
  WORKFLOW_GUIDE_TOPICS,
  WORKFLOW_GUIDE_VERSION,
  workflowGuidePath,
} from "../../../src/services/webmcp/workflow-guide-catalog";

const repositoryRoot = process.cwd();

function functionHook<T extends (...args: never[]) => unknown>(
  hook: T | { handler: T } | undefined
): T {
  if (!hook) throw new Error("missing Vite hook");
  return typeof hook === "function" ? hook : hook.handler;
}

function developmentServer(base = "/") {
  const plugin = webMcpGuides();
  functionHook(plugin.configResolved)({ root: repositoryRoot, base } as never);
  const use = vi.fn();
  functionHook(plugin.configureServer)({
    middlewares: { use },
    config: { logger: { error: vi.fn() } },
  } as never);
  const middleware = use.mock.calls[0][0];

  return (url: string, method = "GET") => {
    const headers = new Map<string, string | number>();
    const response = {
      statusCode: 0,
      setHeader(name: string, value: string | number) {
        headers.set(name, value);
      },
      end: vi.fn(),
    };
    const next = vi.fn();
    middleware({ url, method }, response, next);
    return { response, headers, next, body: response.end.mock.calls[0]?.[0] };
  };
}

describe("WebMCP workflow guide publishing", () => {
  it.each(["/", "/studio/", "https://assets.example/studio/"])(
    "serves exact Markdown and JSON index under Vite base %s",
    (base) => {
      const request = developmentServer(base);
      const pathname = new URL(base, "http://vite.local").pathname;
      const result = request(`${pathname}${workflowGuidePath("overview")}?v=1`);
      const source = readFileSync(
        resolve(repositoryRoot, "src/services/webmcp/guides/overview.md"),
        "utf8"
      );

      expect(result.next).not.toHaveBeenCalled();
      expect(result.response.statusCode).toBe(200);
      expect(result.headers.get("Content-Type")).toBe(
        "text/markdown; charset=utf-8"
      );
      expect(result.headers.get("Content-Length")).toBe(
        Buffer.byteLength(source, "utf8")
      );
      expect(result.body).toBe(source);

      const index = request(`${pathname}${WORKFLOW_GUIDE_INDEX_PATH}`);
      expect(index.headers.get("Content-Type")).toBe(
        "application/json; charset=utf-8"
      );
      expect(JSON.parse(index.body).version).toBe(WORKFLOW_GUIDE_VERSION);
      expect(JSON.parse(index.body).topics).toEqual(
        WORKFLOW_GUIDE_TOPICS.map((topic) => ({
          ...topic,
          path: workflowGuidePath(topic.id),
        }))
      );
    }
  );

  it("returns GET headers and no body for HEAD requests", () => {
    const request = developmentServer();
    for (const path of [
      workflowGuidePath("overview"),
      WORKFLOW_GUIDE_INDEX_PATH,
    ]) {
      const get = request(`/${path}`);
      const head = request(`/${path}`, "HEAD");
      expect(head.next).not.toHaveBeenCalled();
      expect(head.response.statusCode).toBe(200);
      expect(head.headers).toEqual(get.headers);
      expect(head.response.end).toHaveBeenCalledOnce();
      expect(head.body).toBeUndefined();
    }
  });

  it("passes unknown paths, other methods and paths outside the base onward", () => {
    const request = developmentServer("/studio/");
    for (const [url, method] of [
      [`/studio/${workflowGuidePath("unknown")}`, "GET"],
      [`/${workflowGuidePath("overview")}`, "GET"],
      [`/studio/${workflowGuidePath("overview")}`, "POST"],
      ["/studio/webmcp/scene-studio/1.0.1/../../../../package.json", "GET"],
      ["/studio/webmcp/scene-studio/1.0.1/%2e%2e%2fpackage.json", "GET"],
    ]) {
      const result = request(url, method);
      expect(result.next).toHaveBeenCalledOnce();
      expect(result.response.end).not.toHaveBeenCalled();
      expect(result.headers.size).toBe(0);
    }
  });

  it("builds versioned assets whose Markdown matches the checked-in guide source", () => {
    const temporary = mkdtempSync(
      resolve(tmpdir(), "xrugc-webmcp-guide-build-")
    );
    try {
      const entry = resolve(temporary, "entry.js");
      const config = resolve(temporary, "vite.config.mts");
      const output = resolve(temporary, "dist");
      writeFileSync(entry, "export const guideBuild = true;\n");
      writeFileSync(
        config,
        `import { webMcpGuides } from ${JSON.stringify(resolve(repositoryRoot, "build/vite-plugin-webmcp-guides.ts"))};
export default {
  root: ${JSON.stringify(repositoryRoot)},
  base: '/studio/',
  publicDir: false,
  plugins: [webMcpGuides()],
  build: {
    outDir: ${JSON.stringify(output)},
    emptyOutDir: true,
    rollupOptions: { input: ${JSON.stringify(entry)} },
  },
};\n`
      );
      execFileSync(
        process.execPath,
        [
          resolve(repositoryRoot, "node_modules/vite/bin/vite.js"),
          "build",
          "--config",
          config,
        ],
        { cwd: repositoryRoot, stdio: "pipe", timeout: 20_000 }
      );

      const index = JSON.parse(
        readFileSync(resolve(output, WORKFLOW_GUIDE_INDEX_PATH), "utf8")
      );
      expect(index.name).toBe("xrugc-scene-studio");
      expect(index.version).toBe(WORKFLOW_GUIDE_VERSION);
      expect(index.topics).toHaveLength(WORKFLOW_GUIDE_TOPICS.length);
      for (const topic of WORKFLOW_GUIDE_TOPICS) {
        expect(index.topics).toContainEqual({
          ...topic,
          path: workflowGuidePath(topic.id),
        });
        expect(
          readFileSync(resolve(output, workflowGuidePath(topic.id)))
        ).toEqual(
          readFileSync(
            resolve(
              repositoryRoot,
              "src/services/webmcp/guides",
              `${topic.id}.md`
            )
          )
        );
      }
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }, 25_000);
});
