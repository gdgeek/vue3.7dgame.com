import { createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve, sep } from "node:path";
import type { Plugin } from "vite";

/** Same-origin local static runtime. No plugin-domain fallback, including 404s. */
export function createUnityRuntimeMiddleware(
  root = resolve(process.cwd(), ".unity-runtime/webgl-preview")
) {
  return function serve(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    if (
      pathname === "/__xrugc_proxy__" ||
      pathname.startsWith("/__xrugc_proxy__/")
    ) {
      res.writeHead(404, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      });
      res.end(
        "Resource adaptation requires the release-scoped Unity service worker."
      );
      return;
    }
    if (
      !pathname.startsWith("/webgl-preview/") &&
      pathname !== "/webgl-preview"
    )
      return next();
    const fail = (status: number, message: string) => {
      res.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(message);
    };
    if (req.method !== "GET" && req.method !== "HEAD")
      return fail(405, "Method not allowed");
    let file: string;
    try {
      file = resolve(
        root,
        decodeURIComponent(pathname.slice("/webgl-preview/".length))
      );
    } catch {
      return fail(400, "Invalid runtime path");
    }
    if (
      !file.startsWith(`${root}${sep}`) ||
      !existsSync(file) ||
      !statSync(file).isFile()
    ) {
      return fail(
        404,
        "Built-in Unity runtime is missing. Run pnpm unity:acquire, then pnpm unity:prepare after editing runner sources."
      );
    }
    const stat = statSync(file);
    const size = stat.size;
    const etag = `"${size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
    const gzip = file.endsWith(".gz");
    const extension = file.replace(/\.gz$/, "").split(".").pop() || "";
    const mime: Record<string, string> = {
      wasm: "application/wasm",
      data: "application/octet-stream",
      js: "application/javascript",
      css: "text/css",
      json: "application/json",
      html: "text/html",
      png: "image/png",
      ico: "image/x-icon",
    };
    const headers: Record<string, string | number> = {
      "Content-Type": mime[extension] || "application/octet-stream",
      "Content-Length": size,
      "Accept-Ranges": "bytes",
      ETag: etag,
      "Last-Modified": stat.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control":
        pathname.endsWith("active.json") ||
        /\/(?:sw\.js|[^/]+\.html|[^/]+\.json)$/.test(pathname)
          ? "no-store"
          : "public, max-age=31536000, immutable",
    };
    if (gzip) headers["Content-Encoding"] = "gzip";
    if (extension === "html") {
      headers["Content-Security-Policy"] =
        "connect-src 'self' https://data.7dgame.com https://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com https://mrpp-1257979353.cos.ap-chengdu.myqcloud.com blob:; frame-src 'self' blob:; worker-src 'self' blob:";
    }
    let start = 0;
    let end = size - 1;
    let status = 200;
    const ifRange = req.headers["if-range"];
    const rangeMatches =
      !ifRange ||
      (typeof ifRange === "string" &&
        (ifRange === etag ||
          (!ifRange.startsWith('"') &&
            Math.trunc(stat.mtimeMs / 1000) * 1000 <= Date.parse(ifRange))));
    if (req.headers.range && rangeMatches) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (
        !match ||
        (!match[1] && !match[2]) ||
        !size ||
        !Number.isSafeInteger(Number(match[1])) ||
        !Number.isSafeInteger(Number(match[2])) ||
        (match[1] && Number(match[1]) >= size) ||
        (!match[1] && Number(match[2]) === 0) ||
        (match[1] && match[2] && Number(match[2]) < Number(match[1]))
      ) {
        res.setHeader("Content-Range", `bytes */${size}`);
        return fail(416, "Unsatisfiable range");
      }
      start = match[1]
        ? Number(match[1])
        : Math.max(0, size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : end;
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      headers["Content-Length"] = end - start + 1;
    }
    res.writeHead(status, headers);
    if (req.method === "HEAD" || !size) return res.end();
    const stream = createReadStream(file, { start, end });
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  };
}

export function unityRuntimeStatic(): Plugin {
  const serve = createUnityRuntimeMiddleware();
  return {
    name: "builtin-unity-runtime-static",
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
  };
}
