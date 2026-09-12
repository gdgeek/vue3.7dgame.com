import { describe, expect, it } from "vitest";
import { sceneWriteFailure } from "@/services/webmcp/scene-write-failure";

describe("scene persistence failure", () => {
  it("retains local changes and identifies an actual HTTP conflict without exposing response data", () => {
    const failure = sceneWriteFailure(
      {
        isAxiosError: true,
        response: { status: 409, data: { secret: "private" } },
      },
      { ownerId: 2328 },
      "保存失败"
    );
    expect(failure.result).toMatchObject({
      ownerId: 2328,
      editorApplied: true,
      persistence: "server_rejected",
      httpStatus: 409,
      errorCode: "write_conflict",
    });
    expect(JSON.stringify(failure)).not.toContain("private");
    expect(failure.message).toContain("冲突");
  });

  it.each([
    new Error("timeout"),
    { isAxiosError: true, response: { status: 503 } },
    { response: { status: 409 } },
  ])("does not infer a rejected write from an uncertain failure", (error) => {
    const failure = sceneWriteFailure(error, { ownerId: 2328 }, "保存失败");
    expect(failure.result).toMatchObject({
      persistence: "unverified",
      retry: "read_state_before_retry",
    });
    expect(failure.result).not.toHaveProperty("httpStatus");
  });
});
