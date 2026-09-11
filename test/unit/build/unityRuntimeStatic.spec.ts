import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { finished } from "node:stream/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createUnityRuntimeMiddleware } from "../../../build/vite-plugin-unity-runtime";

class Response extends Writable {
  status = 0;
  headers: Record<string, string | number> = {};
  chunks: Buffer[] = [];
  writeHead(status: number, headers: Record<string, string | number>) {
    this.status = status;
    Object.assign(this.headers, headers);
    return this;
  }
  setHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }
}

let root: string;
const bytes = Buffer.from(Array.from({ length: 64 }, (_, index) => index));
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "unity-http-test-"));
  await mkdir(join(root, "Build"));
  await writeFile(join(root, "Build/public.wasm.gz"), bytes);
});
afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

async function request(
  headers: Record<string, string> = {},
  method = "GET",
  url = "/webgl-preview/Build/public.wasm.gz"
) {
  const response = new Response();
  const done = finished(response);
  createUnityRuntimeMiddleware(root)(
    { url, method, headers } as IncomingMessage,
    response as unknown as ServerResponse,
    () => {
      throw new Error("Unity requests must not reach the SPA fallback");
    }
  );
  await done;
  return {
    status: response.status,
    headers: response.headers,
    body: Buffer.concat(response.chunks),
  };
}

describe("local Unity HTTP range parity", () => {
  it.each([
    ["bytes=0-31", 0, 31],
    ["bytes=32-", 32, 63],
    ["bytes=-32", 32, 63],
    ["bytes=-100", 0, 63],
    ["bytes=60-999", 60, 63],
  ])(
    "serves a valid single range %s from compressed transfer bytes",
    async (range, start, end) => {
      const response = await request({ range: String(range) });
      expect(response.status).toBe(206);
      expect(response.headers["Content-Range"]).toBe(
        `bytes ${start}-${end}/64`
      );
      expect(response.headers["Content-Encoding"]).toBe("gzip");
      expect(response.headers["Content-Type"]).toBe("application/wasm");
      expect(response.body).toEqual(
        bytes.subarray(Number(start), Number(end) + 1)
      );
    }
  );

  it.each([
    "bytes=-0",
    "bytes=64-",
    "bytes=5-4",
    "bytes=-",
    "bytes=0-9007199254740992",
  ])("rejects unsatisfiable range %s", async (range) => {
    const response = await request({ range });
    expect(response.status).toBe(416);
    expect(response.headers["Content-Range"]).toBe("bytes */64");
    expect(response.headers["Content-Encoding"]).toBeUndefined();
  });

  it("uses the full representation when If-Range does not match", async () => {
    const full = await request();
    const stale = await request({
      range: "bytes=-32",
      "if-range": '"old-etag"',
    });
    expect(stale.status).toBe(200);
    expect(stale.body).toEqual(bytes);
    const current = await request({
      range: "bytes=-32",
      "if-range": String(full.headers.ETag),
    });
    expect(current.status).toBe(206);
    expect(current.body).toEqual(bytes.subarray(32));
  });

  it("returns no body for HEAD and real 404 for missing compressed artifacts", async () => {
    const head = await request({ range: "bytes=-32" }, "HEAD");
    expect(head.status).toBe(206);
    expect(head.headers["Content-Length"]).toBe(32);
    expect(head.body.length).toBe(0);
    const missing = await request(
      {},
      "GET",
      "/webgl-preview/Build/missing.wasm.gz"
    );
    expect(missing.status).toBe(404);
    expect(missing.headers["Content-Encoding"]).toBeUndefined();
  });
});
