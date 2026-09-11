import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { gzipSync } from "node:zlib";
import manifestTools from "./build-manifest.cjs";
import {
  assertLockedBuild,
  describeSources,
  lock,
  webRoot,
  retainPreviousRuntime,
} from "./runtime.mjs";

test("retention rejects a floating previous image before reading any artifacts", async () => {
  await assert.rejects(
    retainPreviousRuntime({
      previous: "/does-not-exist",
      output: "/does-not-exist",
      previousImage: "test/main:latest",
    }),
    /immutable digest/
  );
});

test("real-artifact verification rejects repository LFS pointers", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "unity-lfs-test-"));
  try {
    await mkdir(path.join(root, "Build"));
    for (const file of lock.files)
      await writeFile(
        path.join(root, file.url),
        `version https://git-lfs.github.com/spec/v1\noid sha256:${file.sha256}\nsize ${file.size}\n`
      );
    await assert.rejects(
      manifestTools.createBuildManifest({ rootDir: root }),
      /Git LFS pointer/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a substituted well-formed build cannot satisfy the pinned binary identity", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "unity-substitute-test-"));
  try {
    await mkdir(path.join(root, "Build"));
    const bytes = Buffer.alloc(4096);
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = (i * 19 + Math.floor(i / 7)) % 256;
    for (const file of lock.files)
      await writeFile(
        path.join(root, file.url),
        file.contentEncoding === "gzip"
          ? gzipSync(Buffer.concat(Array.from({ length: 50 }, () => bytes)))
          : bytes
      );
    const manifest = await manifestTools.createBuildManifest({ rootDir: root });
    assert.throws(() => assertLockedBuild(manifest), /buildId/);
    await writeFile(
      path.join(root, "Build/public.wasm.gz"),
      Buffer.alloc(4096, 0xff)
    );
    await assert.rejects(
      manifestTools.createBuildManifest({ rootDir: root }),
      /Compressed artifact is invalid/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source inventory changes for SW edits and Docker sources cannot float", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "unity-source-test-"));
  try {
    await writeFile(path.join(root, "sw.js"), "version 1");
    const before = await describeSources(root);
    await writeFile(path.join(root, "sw.js"), "version 2");
    assert.notDeepEqual(await describeSources(root), before);
    for (const file of [
      "Dockerfile",
      "docker/production/Dockerfile",
      "docker/staging/Dockerfile",
    ]) {
      const dockerfile = await readFile(path.join(webRoot, file), "utf8");
      assert.ok(
        dockerfile.includes(
          `FROM --platform=linux/amd64 ${lock.unityBaseImage} AS unity-source`
        )
      );
      assert.ok(
        dockerfile.includes("runtime.mjs verify --output /html/webgl-preview")
      );
      assert.ok(!dockerfile.includes("APP_UNITY_PREVIEW_UPSTREAM"));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
