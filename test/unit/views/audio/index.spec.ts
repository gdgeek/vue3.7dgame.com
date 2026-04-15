import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const readSource = (): string =>
  readFileSync(`${process.cwd()}/src/views/audio/index.vue`, "utf-8");

describe("views/audio/index.vue", () => {
  it("uses id-seeded thumbnails as the fallback for audio cards", () => {
    const source = readSource();

    expect(source).toMatch(/getDefaultAvatarUrl\(item\.id,\s*['"]thumbs['"]\)/);
    expect(source).toMatch(
      /:image="\s*item\.image\?\.url\s*\|\|\s*getDefaultAvatarUrl\(item\.id,\s*['"]thumbs['"]\)/
    );
  });

  it("keeps the list thumbnail image fallback instead of replacing it with a static icon", () => {
    const source = readSource();

    expect(source).toMatch(
      /<img[\s\S]*:src="\s*item\.image\?\.url\s*\|\|\s*getDefaultAvatarUrl\(item\.id,\s*['"]thumbs['"]\)/
    );
  });
});
