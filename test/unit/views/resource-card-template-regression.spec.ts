import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const readSource = (relativePath: string): string =>
  readFileSync(`${process.cwd()}/src/${relativePath}`, "utf-8");

const sharedCardPages = [
  "views/picture/index.vue",
  "views/video/index.vue",
  "views/meta/list.vue",
  "views/meta-verse/index.vue",
  "views/phototype/list.vue",
  "views/polygen/index.vue",
];

describe("resource card template regression", () => {
  it("keeps shared resource pages off the old contain override path", () => {
    for (const path of sharedCardPages) {
      const source = readSource(path);

      expect(source).not.toContain('image-fit="contain"');
    }
  });
});
