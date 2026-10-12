#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { lock, prepareRuntime, webRoot } from "./runtime.mjs";

function docker(args) {
  const result = spawnSync("docker", args, { encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(
      `docker ${args[0]} failed: ${result.stderr || result.error?.message}`
    );
  return result.stdout.trim();
}
const artifacts = path.join(webRoot, ".unity-artifacts");
let container;
try {
  console.log(`Acquiring immutable Unity artifacts: ${lock.unityBaseImage}`);
  docker(["pull", "--platform", "linux/amd64", lock.unityBaseImage]);
  // Create only: never start the old plugin image or its entrypoint.
  container = docker([
    "create",
    "--platform",
    "linux/amd64",
    lock.unityBaseImage,
  ]);
  await fs.mkdir(artifacts, { recursive: true });
  await fs.rm(path.join(artifacts, "Build"), { recursive: true, force: true });
  docker(["cp", `${container}:/usr/share/nginx/html/Build`, artifacts]);
  const active = await prepareRuntime({
    artifacts,
    output: path.join(webRoot, ".unity-runtime/webgl-preview"),
  });
  console.log(
    `Prepared ${active.entrypoint}; pnpm dev now serves it locally without an upstream.`
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (container) docker(["rm", container]);
}
