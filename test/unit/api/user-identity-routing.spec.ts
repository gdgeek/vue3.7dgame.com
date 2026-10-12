import { beforeEach, describe, expect, it, vi } from "vitest";
const { request, identity } = vi.hoisted(() => ({
  request: vi.fn(),
  identity: vi.fn(() => true),
}));
vi.mock("@/utils/request", () => ({ default: request }));
vi.mock("@/environment", () => ({
  default: { authApi: "/api-auth", api: "/api" },
}));
vi.mock("@/services/auth/provider", () => ({
  isIdentityProviderEnabled: identity,
}));
import { putUserData } from "@/api/v1/user";
describe("Identity profile writer", () => {
  beforeEach(() => {
    request.mockReset();
    identity.mockReturnValue(true);
  });
  it.each([undefined, 404, 503])(
    "does not write to the old service after Identity fails with %s",
    async (status) => {
      const error = {
        response: status
          ? { status, data: { code: "PROFILE_WRITE_DISABLED" } }
          : undefined,
      };
      request.mockRejectedValue(error);
      await expect(putUserData({ nickname: "updated" })).rejects.toBe(error);
      expect(request).toHaveBeenCalledOnce();
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/v1/user/update", method: "put" })
      );
      expect(request.mock.calls[0][0].baseURL).toBeUndefined();
    }
  );
  it("preserves the full user aggregate returned by the main gateway", async () => {
    const aggregate = {
      id: 24,
      userData: { username: "name", nickname: "updated" },
      userInfo: {
        gold: 123,
        points: 456,
        avatar: { id: 7, url: "/storage/avatar.png" },
        info: { bio: "hello" },
      },
      roles: ["user"],
      perms: [],
      organizations: [],
    };
    request.mockResolvedValue({ data: aggregate });
    const response = await putUserData({ nickname: "updated" });
    expect(response.data).toEqual(aggregate);
  });
});
