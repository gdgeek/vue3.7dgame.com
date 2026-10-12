#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Writable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const zlib = require("node:zlib");

const MANIFEST_SCHEMA_VERSION = 1;
const MIN_ARTIFACT_SIZE = 1024;
const BUILD_FILE_DEFINITIONS = Object.freeze([
  {
    role: "loader",
    pattern: /^(?:[a-f0-9]{32}|public)\.loader\.js$/,
    contentEncoding: "identity",
    contentType: "application/javascript",
  },
  {
    role: "data",
    pattern: /^(?:[a-f0-9]{32}|public)\.data\.(?:br|gz)$/,
    contentType: "application/octet-stream",
  },
  {
    role: "framework",
    pattern: /^(?:[a-f0-9]{32}|public)\.framework\.js\.(?:br|gz)$/,
    contentType: "application/javascript",
  },
  {
    role: "wasm",
    pattern: /^(?:[a-f0-9]{32}|public)\.wasm\.(?:br|gz)$/,
    contentType: "application/wasm",
  },
]);

const LFS_POINTER_RE =
  /^version https:\/\/git-lfs\.github\.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)\r?\n?$/;

const sha256Text = (value) =>
  crypto.createHash("sha256").update(value, "utf8").digest("hex");

const sha256File = async (filePath) => {
  const hash = crypto.createHash("sha256");
  await pipeline(fs.createReadStream(filePath), hash);
  return hash.digest("hex");
};

const readLfsPointer = (filePath) => {
  const stat = fs.statSync(filePath);
  if (stat.size > 1024) return null;

  const match = LFS_POINTER_RE.exec(fs.readFileSync(filePath, "utf8"));
  if (!match) return null;

  return {
    sha256: match[1],
    size: Number(match[2]),
  };
};

const contentEncodingFor = (fileName) => {
  if (fileName.endsWith(".gz")) return "gzip";
  if (fileName.endsWith(".br")) return "br";
  return "identity";
};

const findBuildFiles = (rootDir) => {
  const buildDir = path.join(rootDir, "Build");
  if (!fs.existsSync(buildDir)) {
    throw new Error(`Missing Unity build directory: ${buildDir}`);
  }

  const names = fs
    .readdirSync(buildDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  return BUILD_FILE_DEFINITIONS.map((definition) => {
    const matches = names.filter((name) => definition.pattern.test(name));
    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one ${definition.role} artifact, found ${matches.length}: ${matches.join(", ") || "(none)"}`
      );
    }
    return {
      ...definition,
      fileName: matches[0],
      filePath: path.join(buildDir, matches[0]),
    };
  });
};

const describeDecodedFile = async (filePath, contentEncoding) => {
  if (contentEncoding === "identity") {
    const stat = fs.statSync(filePath);
    return { sha256: await sha256File(filePath), size: stat.size };
  }

  const decoder =
    contentEncoding === "gzip"
      ? zlib.createGunzip()
      : zlib.createBrotliDecompress();
  const hash = crypto.createHash("sha256");
  let size = 0;
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      hash.update(chunk);
      size += chunk.byteLength;
      callback();
    },
  });

  try {
    await pipeline(fs.createReadStream(filePath), decoder, sink);
  } catch (error) {
    throw new Error(
      `Compressed artifact is invalid (${contentEncoding}): ${filePath}: ${error.message}`
    );
  }
  return { sha256: hash.digest("hex"), size };
};

const canonicalBuildDescription = (files) =>
  files
    .map(
      (file) =>
        `${file.role}\0${file.url}\0${file.size}\0${file.sha256}\0${file.contentEncoding}\0${file.contentType}`
    )
    .join("\n");

const computeBuildId = (files) =>
  `sha256:${sha256Text(canonicalBuildDescription(files))}`;

const describeBuildFile = async (definition, options) => {
  const lfsPointer = readLfsPointer(definition.filePath);
  if (lfsPointer && !options.allowLfsMetadata) {
    throw new Error(
      `Unity artifact is still a Git LFS pointer: ${definition.filePath}`
    );
  }

  const stat = fs.statSync(definition.filePath);
  const contentEncoding =
    definition.contentEncoding || contentEncodingFor(definition.fileName);
  const size = lfsPointer ? lfsPointer.size : stat.size;
  if (!Number.isSafeInteger(size) || size < MIN_ARTIFACT_SIZE) {
    throw new Error(
      `Unity artifact is unexpectedly small: ${definition.filePath} (${size} bytes)`
    );
  }

  const sha256 = lfsPointer
    ? lfsPointer.sha256
    : await sha256File(definition.filePath);
  // Fetch/Service Worker exposes the Content-Encoding decoded response body.
  // Keep sha256 as the immutable on-disk artifact identity, and publish the
  // derived response digest separately for bounded streaming verification.
  const decoded = lfsPointer
    ? null
    : await describeDecodedFile(definition.filePath, contentEncoding);
  const responseSha256 = decoded ? decoded.sha256 : null;
  const responseSize = decoded ? decoded.size : null;

  return {
    role: definition.role,
    url: `Build/${definition.fileName}`,
    size,
    sha256,
    responseSha256,
    responseSize,
    contentEncoding,
    contentType: definition.contentType,
  };
};

const createBuildManifest = async ({ rootDir, allowLfsMetadata = false }) => {
  const definitions = findBuildFiles(rootDir);
  const files = [];
  for (const definition of definitions) {
    files.push(
      await describeBuildFile(definition, {
        allowLfsMetadata,
      })
    );
  }

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    buildId: computeBuildId(files),
    totalSize: files.reduce((total, file) => total + file.size, 0),
    files,
  };
};

const assertManifestShape = (manifest) => {
  if (!manifest || manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported build manifest schema: ${manifest && manifest.schemaVersion}`
    );
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(manifest.buildId || "")) {
    throw new Error(`Invalid buildId: ${manifest.buildId}`);
  }
  if (!Number.isSafeInteger(manifest.totalSize) || manifest.totalSize < 0) {
    throw new Error(`Invalid totalSize: ${manifest.totalSize}`);
  }
  if (!Array.isArray(manifest.files) || manifest.files.length !== 4) {
    throw new Error("Build manifest must contain exactly four Unity artifacts");
  }

  const expectedRoles = BUILD_FILE_DEFINITIONS.map(({ role }) => role);
  const roles = manifest.files.map(({ role }) => role);
  if (
    roles.length !== new Set(roles).size ||
    expectedRoles.some((role) => !roles.includes(role))
  ) {
    throw new Error(`Invalid artifact roles: ${roles.join(", ")}`);
  }

  for (const file of manifest.files) {
    if (!/^[a-f0-9]{64}$/.test(file.sha256 || "")) {
      throw new Error(`Invalid SHA-256 for ${file.role}`);
    }
    if (
      file.responseSha256 !== null &&
      !/^[a-f0-9]{64}$/.test(file.responseSha256 || "")
    ) {
      throw new Error(`Invalid response SHA-256 for ${file.role}`);
    }
    if (
      file.responseSize !== null &&
      (!Number.isSafeInteger(file.responseSize) || file.responseSize <= 0)
    ) {
      throw new Error(`Invalid responseSize for ${file.role}`);
    }
    if (!Number.isSafeInteger(file.size) || file.size < MIN_ARTIFACT_SIZE) {
      throw new Error(`Invalid size for ${file.role}: ${file.size}`);
    }
    if (!["identity", "gzip", "br"].includes(file.contentEncoding)) {
      throw new Error(`Invalid contentEncoding for ${file.role}`);
    }
    if (typeof file.contentType !== "string" || !file.contentType) {
      throw new Error(`Invalid contentType for ${file.role}`);
    }
    if (
      typeof file.url !== "string" ||
      !/^Build\/[^/]+$/.test(file.url) ||
      file.url.includes("..")
    ) {
      throw new Error(`Unsafe artifact URL for ${file.role}: ${file.url}`);
    }
  }
};

const verifyBuildManifest = async ({
  rootDir,
  manifestPath,
  allowLfsMetadata = false,
}) => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assertManifestShape(manifest);

  const discovered = await createBuildManifest({ rootDir, allowLfsMetadata });
  const expectedByRole = new Map(
    discovered.files.map((file) => [file.role, file])
  );

  for (const actual of manifest.files) {
    const expected = expectedByRole.get(actual.role);
    for (const field of [
      "url",
      "size",
      "sha256",
      "responseSha256",
      "responseSize",
      "contentEncoding",
      "contentType",
    ]) {
      if (actual[field] !== expected[field]) {
        throw new Error(
          `Manifest mismatch for ${actual.role}.${field}: expected ${expected[field]}, got ${actual[field]}`
        );
      }
    }
  }

  if (manifest.totalSize !== discovered.totalSize) {
    throw new Error(
      `Manifest totalSize mismatch: expected ${discovered.totalSize}, got ${manifest.totalSize}`
    );
  }
  if (manifest.buildId !== discovered.buildId) {
    throw new Error(
      `Manifest buildId mismatch: expected ${discovered.buildId}, got ${manifest.buildId}`
    );
  }

  return manifest;
};

const parseCli = (argv) => {
  const [command, ...args] = argv;
  const options = {
    command,
    rootDir: "public",
    manifestPath: "public/build-manifest.json",
    allowLfsMetadata: false,
    stdout: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--root") {
      options.rootDir = args[++index];
    } else if (argument === "--output" || argument === "--manifest") {
      options.manifestPath = args[++index];
    } else if (argument === "--allow-lfs-metadata") {
      options.allowLfsMetadata = true;
    } else if (argument === "--stdout") {
      options.stdout = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!["generate", "verify"].includes(options.command)) {
    throw new Error(
      "Usage: build-manifest.js <generate|verify> [--root DIR] [--output FILE|--manifest FILE] [--allow-lfs-metadata] [--stdout]"
    );
  }
  return options;
};

const runCli = async () => {
  const options = parseCli(process.argv.slice(2));
  const rootDir = path.resolve(options.rootDir);
  const manifestPath = path.resolve(options.manifestPath);

  if (options.command === "generate") {
    const manifest = await createBuildManifest({
      rootDir,
      allowLfsMetadata: options.allowLfsMetadata,
    });
    const output = `${JSON.stringify(manifest, null, 2)}\n`;
    if (options.stdout) {
      process.stdout.write(output);
    } else {
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      const temporaryPath = `${manifestPath}.tmp-${process.pid}`;
      fs.writeFileSync(temporaryPath, output);
      fs.renameSync(temporaryPath, manifestPath);
      console.log(`Generated ${manifestPath} (${manifest.buildId})`);
    }
    return;
  }

  const manifest = await verifyBuildManifest({
    rootDir,
    manifestPath,
    allowLfsMetadata: options.allowLfsMetadata,
  });
  console.log(`Verified ${manifestPath} (${manifest.buildId})`);
};

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  BUILD_FILE_DEFINITIONS,
  MANIFEST_SCHEMA_VERSION,
  computeBuildId,
  createBuildManifest,
  readLfsPointer,
  verifyBuildManifest,
};
