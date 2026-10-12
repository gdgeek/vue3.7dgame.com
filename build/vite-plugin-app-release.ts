import type { Plugin } from "vite";
export const appReleasePlugin = (buildTimestamp: number): Plugin => ({
  name: "app-release-metadata",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "app-release.json",
      source: JSON.stringify({ schemaVersion: 1, buildTimestamp }),
    });
  },
});
