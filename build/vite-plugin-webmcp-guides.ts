import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import {
  WORKFLOW_GUIDE_INDEX_PATH,
  WORKFLOW_GUIDE_TOPICS,
  WORKFLOW_GUIDE_VERSION,
  workflowGuidePath,
} from "../src/services/webmcp/workflow-guide-catalog";

const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

/** Publish the same checked-in Markdown used by the WebMCP guide tool. */
export function webMcpGuides(): Plugin {
  let root = process.cwd();
  let basePath = "/";

  const resources = new Map(
    WORKFLOW_GUIDE_TOPICS.map((topic) => [
      workflowGuidePath(topic.id),
      {
        contentType: MARKDOWN_CONTENT_TYPE,
        read: () =>
          readFileSync(
            resolve(root, "src/services/webmcp/guides", `${topic.id}.md`),
            "utf8"
          ),
      },
    ])
  );
  resources.set(WORKFLOW_GUIDE_INDEX_PATH, {
    contentType: JSON_CONTENT_TYPE,
    read: () =>
      `${JSON.stringify(
        {
          name: "xrugc-scene-studio",
          version: WORKFLOW_GUIDE_VERSION,
          topics: WORKFLOW_GUIDE_TOPICS.map((topic) => ({
            ...topic,
            path: workflowGuidePath(topic.id),
          })),
        },
        null,
        2
      )}\n`,
  });

  return {
    name: "vite-plugin-webmcp-guides",

    configResolved(config) {
      root = config.root;
      // Vite normalizes relative development bases to /; absolute bases may
      // include an origin, while the middleware always matches a pathname.
      basePath = new URL(config.base || "/", "http://vite.local/").pathname;
      if (!basePath.endsWith("/")) basePath += "/";
    },

    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") {
          next();
          return;
        }

        let pathname: string;
        try {
          pathname = new URL(request.url || "/", "http://vite.local").pathname;
        } catch {
          next();
          return;
        }
        const resource = pathname.startsWith(basePath)
          ? resources.get(pathname.slice(basePath.length))
          : undefined;
        if (!resource) {
          next();
          return;
        }

        try {
          const body = resource.read();
          response.statusCode = 200;
          response.setHeader("Content-Type", resource.contentType);
          response.setHeader("Content-Length", Buffer.byteLength(body, "utf8"));
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("X-Content-Type-Options", "nosniff");
          response.end(request.method === "HEAD" ? undefined : body);
        } catch (error) {
          server.config.logger.error(
            error instanceof Error ? error.message : "WebMCP guide read failed"
          );
          response.statusCode = 500;
          response.setHeader("Content-Type", JSON_CONTENT_TYPE);
          response.setHeader("Cache-Control", "no-store");
          response.end(
            request.method === "HEAD"
              ? undefined
              : JSON.stringify({ error: "WebMCP guide unavailable" })
          );
        }
      });
    },

    generateBundle() {
      for (const [fileName, resource] of resources) {
        this.emitFile({
          type: "asset",
          fileName,
          source: resource.read(),
        });
      }
    },
  };
}
