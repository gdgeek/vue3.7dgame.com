import { describe, expect, it } from "vitest";
import {
  cloneForUnityPreview,
  normalizeUnityPreviewData,
  rewriteUnityPreviewUrls,
} from "@/utils/unityPreviewPayload";

describe("unityPreviewPayload", () => {
  it("rewrites absolute asset urls through the preview proxy", () => {
    const payload = {
      resources: [
        {
          url: "http://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/model.glb",
        },
      ],
    };

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(payload.resources[0].url).toBe(
      "https://xrugc.com/__xrugc_proxy__?url=https%3A%2F%2Fdata.7dgame.com%2Fmodel.glb"
    );
  });

  it("rewrites relative asset paths against the api origin", () => {
    const payload = {
      audio: "/uploads/background.mp3",
    };

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(payload.audio).toBe(
      "https://xrugc.com/__xrugc_proxy__?url=https%3A%2F%2Fapi.d.xrteeth.com%2Fuploads%2Fbackground.mp3"
    );
  });

  it("normalizes json string fields without mutating the original object", () => {
    const source = {
      data: '{"model":"/assets/demo.glb"}',
    };
    const payload = cloneForUnityPreview(source);

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(source.data).toBe('{"model":"/assets/demo.glb"}');
    expect((payload as typeof source).data).toContain("/__xrugc_proxy__");
  });

  it("parses json scene data when possible", () => {
    expect(normalizeUnityPreviewData('{"foo":1}')).toEqual({ foo: 1 });
    expect(normalizeUnityPreviewData("plain text")).toBe("plain text");
  });
});
