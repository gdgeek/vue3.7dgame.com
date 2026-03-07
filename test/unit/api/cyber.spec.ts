/**
 * Unit tests for src/api/v1/cyber.ts
 * Covers: putCyber, postCyber
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/request", () => ({ default: vi.fn() }));

describe("Cyber API", () => {
  let request: ReturnType<typeof vi.fn>;
  let cyberApi: typeof import("@/api/v1/cyber");

  beforeEach(async () => {
    vi.clearAllMocks();
    request = (await import("@/utils/request")).default as ReturnType<
      typeof vi.fn
    >;
    request.mockResolvedValue({ data: {} });
    cyberApi = await import("@/api/v1/cyber");
  });

  // -------------------------------------------------------------------------
  // putCyber()
  // -------------------------------------------------------------------------
  describe("putCyber()", () => {
    it("calls PUT /v1/cybers/{id}", async () => {
      const data = { name: "Updated Cyber" } as Parameters<
        typeof cyberApi.putCyber
      >[1];
      await cyberApi.putCyber(4, data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/cybers/4", method: "put" })
      );
    });

    it("sends the data payload", async () => {
      const data = { name: "Alpha Cyber", scene_id: 10 } as Parameters<
        typeof cyberApi.putCyber
      >[1];
      await cyberApi.putCyber(4, data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 4, name: "Alpha Cyber" } };
      request.mockResolvedValue(mockResp);
      const result = await cyberApi.putCyber(4, {
        name: "Alpha Cyber",
      } as Parameters<typeof cyberApi.putCyber>[1]);
      expect(result).toEqual(mockResp);
    });
  });

  // -------------------------------------------------------------------------
  // postCyber()
  // -------------------------------------------------------------------------
  describe("postCyber()", () => {
    it("calls POST /v1/cybers", async () => {
      const data = { name: "New Cyber" } as Parameters<
        typeof cyberApi.postCyber
      >[0];
      await cyberApi.postCyber(data);
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/cybers", method: "post" })
      );
    });

    it("sends the data payload", async () => {
      const data = { name: "Beta Cyber", scene_id: 5 } as Parameters<
        typeof cyberApi.postCyber
      >[0];
      await cyberApi.postCyber(data);
      expect(request.mock.calls[0][0].data).toEqual(data);
    });

    it("returns the request result", async () => {
      const mockResp = { data: { id: 1, name: "Beta Cyber" } };
      request.mockResolvedValue(mockResp);
      const result = await cyberApi.postCyber({
        name: "Beta Cyber",
      } as Parameters<typeof cyberApi.postCyber>[0]);
      expect(result).toEqual(mockResp);
    });
  });
});
