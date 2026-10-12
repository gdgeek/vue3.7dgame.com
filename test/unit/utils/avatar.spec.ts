import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultAvatarUrl, getUserAvatarUrl } from "@/utils/avatar";

describe("avatar URLs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves ordinary default and custom avatar URLs", () => {
    expect(getDefaultAvatarUrl("alice")).toBe(
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=alice"
    );
    expect(getDefaultAvatarUrl(42, "thumbs")).toBe(
      "https://api.dicebear.com/9.x/thumbs/svg?seed=42"
    );
    expect(getUserAvatarUrl("https://example.com/avatar.png", "alice")).toBe(
      "https://example.com/avatar.png"
    );
    expect(getUserAvatarUrl(null, "alice")).toBe(
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=alice"
    );
  });

  it("uses only the local icon inside the isolated attestor", () => {
    vi.stubGlobal("__task51RecordForbiddenChannel", () => {});

    expect(getDefaultAvatarUrl("alice")).toBe("/icon.png");
    expect(getUserAvatarUrl(null, "alice")).toBe("/icon.png");
    expect(getUserAvatarUrl("https://example.com/avatar.png", "alice")).toBe(
      "/icon.png"
    );
  });

  it("does not switch avatars for an invalid attestor marker", () => {
    vi.stubGlobal("__task51RecordForbiddenChannel", true);

    expect(getDefaultAvatarUrl("alice")).toContain("api.dicebear.com");
  });
});
