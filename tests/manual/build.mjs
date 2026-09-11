// Build only the manual harness for a read-only mount into a disposable final
// image. It is never copied into the production image or used as a native MCP shim.
import { build } from "vite";
import path from "node:path";

const output = process.argv[2];
if (!output)
  throw new Error("Usage: node tests/manual/build.mjs /absolute/output");
if (!path.isAbsolute(output))
  throw new Error("Output must be an absolute path");
await build({
  configFile: path.resolve("vite.config.ts"),
  mode: "production",
  base: "/__unity-acceptance/",
  publicDir: false,
  build: {
    outDir: output,
    emptyOutDir: false,
    rollupOptions: { input: path.resolve("tests/manual/unity-runtime.html") },
  },
});
