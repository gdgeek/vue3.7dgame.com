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
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
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

    it("calls request exactly once per invocation", async () => {
      await siteApi.PostSiteAppleId(applePayload);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it("passes the original payload object by reference", async () => {
      await siteApi.PostSiteAppleId(applePayload);
      expect(request.mock.calls[0][0].data).toBe(applePayload);
    });

    it("keeps method as post for minimal payloads", async () => {
      const minimalPayload = {} as Parameters<
        typeof siteApi.PostSiteAppleId
      >[0];
      await siteApi.PostSiteAppleId(minimalPayload);
      expect(request.mock.calls[0][0].method).toBe("post");
    });

    it("supports extended payload fields without stripping", async () => {
      const extendedPayload = {
        ...applePayload,
        state: "nonce-001",
        user: { email: "dev@example.com" },
      } as Parameters<typeof siteApi.PostSiteAppleId>[0];

      await siteApi.PostSiteAppleId(extendedPayload);
      expect(request.mock.calls[0][0].data).toEqual(extendedPayload);
    });

    it("propagates request rejection", async () => {
      request.mockRejectedValueOnce(new Error("network-down"));
      await expect(siteApi.PostSiteAppleId(applePayload)).rejects.toThrow(
        "network-down"
      );
    });
  });
});
