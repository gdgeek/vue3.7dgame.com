/**
 * Unit tests for src/api/v1/site.ts
 * Covers: PostSiteAppleId — Apple OAuth callback POST
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

// The module imports types from @/api/auth/model — no runtime dependency to mock.

describe("Site API", () => {
  let request: ReturnType<typeof vi.fn>;
  let siteApi: typeof import("@/api/v1/site");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<typeof vi.fn>;
    request.mockResolvedValue({ data: {} });
    siteApi = await import("@/api/v1/site");
  });

  // -------------------------------------------------------------------------
  // PostSiteAppleId()
  // -------------------------------------------------------------------------
  describe("PostSiteAppleId()", () => {
    const applePayload = {
      code: "auth-code-abc",
      id_token: "id-token-xyz",
    } as Parameters<typeof siteApi.PostSiteAppleId>[0];

    it("calls POST /v1/site/apple-id", async () => {
      await siteApi.PostSiteAppleId(applePayload);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/site/apple-id", method: "post" })
      );
    });

    it("sends the Apple payload as request data", async () => {
      await siteApi.PostSiteAppleId(applePayload);
      expect(request.mock.calls[0][0].data).toEqual(applePayload);
    });

    it("returns the request result", async () => {
      const mockResp = { data: { token: "jwt-abc123" } };
      request.mockResolvedValue(mockResp);
      const result = await siteApi.PostSiteAppleId(applePayload);
      expect(result).toEqual(mockResp);
    });
  });
});
