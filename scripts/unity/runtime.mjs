#!/usr/bin/env node
// Manifest streaming primitives copied from 7dgame-com/webgl-preview at
// f3fbe0dda98e6f9255339c0c880ff2015d021199; see runtime/unity/ provenance.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import manifestTools from "./build-manifest.cjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const webRoot = path.resolve(here, "../..");
export const lock = JSON.parse(
  await fs.readFile(path.join(here, "artifact-lock.json"), "utf8")
);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));

export async function describeSources(root) {
  const entries = [];
  async function visit(directory, prefix = "") {
    for (const entry of (
      await fs.readdir(directory, { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const name = `${prefix}${entry.name}`;
      if (entry.isSymbolicLink())
        throw new Error(`Runtime symlink is forbidden: ${name}`);
      if (entry.isDirectory())
        await visit(path.join(directory, entry.name), `${name}/`);
      else if (entry.isFile()) {
        const filePath = path.join(directory, entry.name);
        const digest = createHash("sha256");
        await pipeline(createReadStream(filePath), digest);
        entries.push({
          url: name,
          size: (await fs.stat(filePath)).size,
          sha256: digest.digest("hex"),
        });
      }
    }
  }
  await visit(root);
  return entries.sort((a, b) => a.url.localeCompare(b.url, "en"));
}

export function assertLockedBuild(manifest) {
  assert.equal(
    manifest.buildId,
    lock.buildId,
    "Unity buildId must match the checked-in digest lock"
  );
  for (const expected of lock.files) {
    const actual = manifest.files.find((file) => file.role === expected.role);
    for (const [key, value] of Object.entries(expected))
      assert.equal(actual?.[key], value, `Locked ${expected.role}.${key}`);
    assert.match(actual.responseSha256, /^[a-f0-9]{64}$/);
    assert.ok(
      actual.responseSize > 0,
      "Decoded transfer metadata must be present"
    );
  }
}

function identityFor(files, identity = lock) {
  return hash(
    JSON.stringify({
      protocolVersion: identity.protocolVersion,
      buildId: identity.buildId,
      unityBaseImage: identity.unityBaseImage,
      files,
    })
  ).slice(0, 24);
}

export async function prepareRuntime({
  artifacts,
  output,
  source = path.join(webRoot, "runtime/unity/public"),
}) {
  // Validate before writing output; the repository's LFS metadata is never accepted.
  const build = await manifestTools.createBuildManifest({ rootDir: artifacts });
  assertLockedBuild(build);
  const sourceFiles = await describeSources(source);
  for (const required of [
    "embed.html",
    "sw.js",
    "modules/embed-parent-protocol.js",
  ]) {
    assert.ok(
      sourceFiles.some((file) => file.url === required),
      `Missing runner source: ${required}`
    );
  }
  assert.ok(
    !sourceFiles.some((file) => file.url.startsWith("Build/")),
    "Unity binaries must come from the digest source"
  );
  const compatibility = {
    schemaVersion: 1,
    protocolVersion: lock.protocolVersion,
    unityBuildId: lock.buildId,
    unityBaseImage: lock.unityBaseImage,
    runnerSourceRevision: lock.sourceRevision,
    // A declared compatibility constraint is not a claim of browser acceptance.
    validation: "locked-artifact-and-protocol-contract",
  };
  const metadata = [
    { url: "build-manifest.json", bytes: Buffer.from(json(build)) },
    {
      url: "artifact-compatibility.json",
      bytes: Buffer.from(json(compatibility)),
    },
  ];
  const files = [
    ...sourceFiles,
    ...metadata.map(({ url, bytes }) => ({
      url,
      size: bytes.length,
      sha256: hash(bytes),
    })),
    ...build.files.map(({ url, size, sha256 }) => ({ url, size, sha256 })),
  ].sort((a, b) => a.url.localeCompare(b.url, "en"));
  assert.equal(
    new Set(files.map((file) => file.url)).size,
    files.length,
    "Duplicate runtime asset"
  );
  const runtimeReleaseId = identityFor(files);
  const release = path.join(output, "releases", runtimeReleaseId);
  await fs.mkdir(release, { recursive: true });
  await fs.cp(source, release, { recursive: true });
  await fs.cp(path.join(artifacts, "Build"), path.join(release, "Build"), {
    recursive: true,
  });
  for (const { url, bytes } of metadata)
    await fs.writeFile(path.join(release, url), bytes);
  const active = {
    protocolVersion: lock.protocolVersion,
    runtimeReleaseId,
    buildId: build.buildId,
    entrypoint: `/webgl-preview/releases/${runtimeReleaseId}/embed.html`,
  };
  await fs.writeFile(
    path.join(release, "runtime-release.json"),
    json({ ...active, unityBaseImage: lock.unityBaseImage, files })
  );
  await verifyRelease(release);
  await fs.mkdir(output, { recursive: true });
  // Publish the pointer last. Existing local releases remain available to active iframes.
  const temporary = path.join(output, `active.json.${process.pid}.tmp`);
  await fs.writeFile(temporary, json(active));
  await fs.rename(temporary, path.join(output, "active.json"));
  return active;
}

export async function verifyRelease(
  release,
  { requireCurrentLock = true } = {}
) {
  const metadata = await readJson(path.join(release, "runtime-release.json"));
  assert.equal(metadata.protocolVersion, lock.protocolVersion);
  assert.match(metadata.unityBaseImage, /^[^\s@]+@sha256:[a-f0-9]{64}$/);
  if (requireCurrentLock) {
    assert.equal(metadata.unityBaseImage, lock.unityBaseImage);
    assert.equal(metadata.buildId, lock.buildId);
  }
  assert.equal(
    metadata.runtimeReleaseId,
    identityFor(metadata.files, metadata),
    "Runtime release identity mismatch"
  );
  assert.equal(path.basename(release), metadata.runtimeReleaseId);
  assert.equal(
    metadata.entrypoint,
    `/webgl-preview/releases/${metadata.runtimeReleaseId}/embed.html`
  );
  const actual = await describeSources(release);
  assert.deepEqual(
    actual.filter((file) => file.url !== "runtime-release.json"),
    metadata.files,
    "Final runtime file inventory/hash/size mismatch"
  );
  const build = await manifestTools.verifyBuildManifest({
    rootDir: release,
    manifestPath: path.join(release, "build-manifest.json"),
  });
  assert.equal(build.buildId, metadata.buildId);
  if (requireCurrentLock) assertLockedBuild(build);
  const compatibility = await readJson(
    path.join(release, "artifact-compatibility.json")
  );
  assert.equal(compatibility.protocolVersion, metadata.protocolVersion);
  assert.equal(compatibility.unityBuildId, build.buildId);
  assert.equal(compatibility.unityBaseImage, metadata.unityBaseImage);
  return metadata;
}

export async function retainPreviousRuntime({
  previous,
  output,
  previousImage,
}) {
  assert.match(
    previousImage,
    /^[^\s@]+@sha256:[a-f0-9]{64}$/,
    "Previous main image must use an immutable digest"
  );
  const current = await verifyRuntime(output);
  let previousActive;
  try {
    previousActive = await readJson(path.join(previous, "active.json"));
  } catch (error) {
    // Only the explicit bootstrap image may omit a built-in runtime. A missing
    // pointer in an upgrade image must fail instead of silently dropping retention.
    if (error.code !== "ENOENT" || previousImage !== lock.unityBaseImage)
      throw error;
    const inventory = { schemaVersion: 1, previousImage, retained: [] };
    await fs.writeFile(
      path.join(output, "retained-releases.json"),
      json(inventory)
    );
    return inventory;
  }
  assert.match(previousActive.runtimeReleaseId, /^[a-f0-9]{24}$/);
  const release = path.join(
    previous,
    "releases",
    previousActive.runtimeReleaseId
  );
  const metadata = await verifyRelease(release, { requireCurrentLock: false });
  for (const key of [
    "runtimeReleaseId",
    "buildId",
    "entrypoint",
    "protocolVersion",
  ])
    assert.equal(previousActive[key], metadata[key]);
  const retained = [];
  if (current.runtimeReleaseId !== previousActive.runtimeReleaseId) {
    await fs.cp(
      release,
      path.join(output, "releases", previousActive.runtimeReleaseId),
      { recursive: true }
    );
    retained.push({
      runtimeReleaseId: metadata.runtimeReleaseId,
      buildId: metadata.buildId,
    });
  }
  // Copy exactly the previous active release, never its already-retained history.
  const inventory = { schemaVersion: 1, previousImage, retained };
  await fs.writeFile(
    path.join(output, "retained-releases.json"),
    json(inventory)
  );
  await verifyRuntime(output);
  return inventory;
}

export async function verifyRuntime(output) {
  const active = await readJson(path.join(output, "active.json"));
  assert.match(active.runtimeReleaseId, /^[a-f0-9]{24}$/);
  const metadata = await verifyRelease(
    path.join(output, "releases", active.runtimeReleaseId)
  );
  for (const key of [
    "runtimeReleaseId",
    "buildId",
    "entrypoint",
    "protocolVersion",
  ])
    assert.equal(active[key], metadata[key]);
  let retained;
  try {
    retained = await readJson(path.join(output, "retained-releases.json"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (retained) {
    assert.equal(retained.schemaVersion, 1);
    assert.match(retained.previousImage, /^[^\s@]+@sha256:[a-f0-9]{64}$/);
    assert.ok(
      Array.isArray(retained.retained) && retained.retained.length <= 1
    );
    for (const item of retained.retained) {
      assert.match(item.runtimeReleaseId, /^[a-f0-9]{24}$/);
      assert.notEqual(item.runtimeReleaseId, active.runtimeReleaseId);
      const previous = await verifyRelease(
        path.join(output, "releases", item.runtimeReleaseId),
        { requireCurrentLock: false }
      );
      assert.equal(previous.buildId, item.buildId);
    }
  }
  return active;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, ...args] = process.argv.slice(2);
  const option = (name, fallback) =>
    args.includes(name) ? path.resolve(args[args.indexOf(name) + 1]) : fallback;
  const output = option(
    "--output",
    path.join(webRoot, ".unity-runtime/webgl-preview")
  );
  try {
    const result =
      command === "prepare"
        ? await prepareRuntime({
            artifacts: option(
              "--artifacts",
              path.join(webRoot, ".unity-artifacts")
            ),
            output,
          })
        : command === "retain"
          ? await retainPreviousRuntime({
              previous: option("--previous"),
              output,
              previousImage: args[args.indexOf("--previous-image") + 1],
            })
          : command === "verify"
            ? await verifyRuntime(output)
            : (() => {
                throw new Error(
                  "Usage: runtime.mjs prepare|verify|retain [--artifacts DIR] [--output DIR] [--previous DIR --previous-image name@sha256:digest]"
                );
              })();
    console.log(json(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
