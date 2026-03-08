import { describe, it, expect } from "vitest";

import { TOKEN_KEY } from "@/enums/CacheEnum";

describe("CacheEnum", () => {
  it("TOKEN_KEY equals 'access_token'", () => {
    expect(TOKEN_KEY).toBe("access_token");
  });

  it("TOKEN_KEY is a string", () => {
    expect(typeof TOKEN_KEY).toBe("string");
  });

  it("TOKEN_KEY is non-empty", () => {
    expect(TOKEN_KEY.length).toBeGreaterThan(0);
  });

  it("TOKEN_KEY contains only safe characters (no spaces)", () => {
    expect(TOKEN_KEY).toMatch(/^\S+$/);
  });

  it("TOKEN_KEY matches the expected cache key pattern", () => {
    expect(TOKEN_KEY).toMatch(/^[a-z_]+$/);
  });
});
