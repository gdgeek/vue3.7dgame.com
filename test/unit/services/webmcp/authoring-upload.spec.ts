import { describe, it, expect } from "vitest";
import {
  beginAuthoringUpload,
  authoringUploadStatus,
  claimAuthoringUpload,
  trackAuthoringUpload,
  setAuthoringUploadState,
} from "@/services/webmcp/authoring-upload";
describe("authoring upload receipt tracking", () => {
  it("tracks returned resource IDs, never the picker opening", async () => {
    const id = beginAuthoringUpload("3", "picture");
    expect(claimAuthoringUpload(id, "3", "picture")).toBe(true);
    expect(authoringUploadStatus(id, "3")).toMatchObject({
      completedResourceIds: [],
      allFilesUploaded: false,
    });
    await trackAuthoringUpload(id, "3", async () => ({ data: { id: 77 } }));
    expect(authoringUploadStatus(id, "3")).toMatchObject({
      completedResourceIds: [77],
    });
  });
  it("does not claim another user or resource type", () => {
    const id = beginAuthoringUpload("3", "picture");
    expect(claimAuthoringUpload(id, "4", "picture")).toBe(false);
    expect(claimAuthoringUpload(id, "3", "video")).toBe(false);
    expect(authoringUploadStatus(id, "4")).toEqual({ status: "not_found" });
  });
  it("marks errors unknown, not completed", async () => {
    const id = beginAuthoringUpload("3", "audio");
    claimAuthoringUpload(id, "3", "audio");
    await expect(
      trackAuthoringUpload(id, "3", async () => {
        throw new Error("lost response");
      })
    ).rejects.toThrow();
    expect(authoringUploadStatus(id, "3")).toMatchObject({
      completedResourceIds: [],
      items: [{ status: "unknown" }],
    });
  });
  it("does not attach later uploads after page disposal", async () => {
    const id = beginAuthoringUpload("3", "picture");
    claimAuthoringUpload(id, "3", "picture");
    setAuthoringUploadState(id, "3", "closed");
    await trackAuthoringUpload(id, "3", async () => ({ data: { id: 9 } }));
    expect(authoringUploadStatus(id, "3")).toMatchObject({
      completedResourceIds: [],
    });
  });
  it("keeps known in-flight results when the page closes", async () => {
    const id = beginAuthoringUpload("3", "picture");
    claimAuthoringUpload(id, "3", "picture");
    await trackAuthoringUpload(id, "3", async () => {
      setAuthoringUploadState(id, "3", "closed");
      return { data: { id: 10 } };
    });
    expect(authoringUploadStatus(id, "3")).toMatchObject({
      status: "closed",
      completedResourceIds: [10],
    });
  });
});
