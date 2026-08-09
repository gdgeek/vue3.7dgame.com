import { describe, expect, it } from "vitest";
import {
  cloneForUnityPreview,
  normalizeUnityPreviewData,
  rewriteUnityPreviewUrls,
} from "@/utils/unityPreviewPayload";

const withWindowLocation = <T>(
  location: Pick<Location, "hostname" | "protocol">,
  callback: () => T
): T => {
  const originalLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: location,
  });
  try {
    return callback();
  } finally {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  }
};

describe("unityPreviewPayload", () => {
  it("preserves allowlisted absolute signed asset urls byte-for-byte", () => {
    const signedUrl =
      "https://data.7dgame.com/model.glb?token=a%26b%3Dc&part=1&part=2";
    const payload = {
      resources: [{ url: signedUrl }],
    };

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(payload.resources[0].url).toBe(signedUrl);
  });

  it("preserves the provider-approved MRPP COS origin byte-for-byte", () => {
    const signedUrl =
      "https://mrpp-1257979353.cos.ap-chengdu.myqcloud.com/resource?id=42&sign=a%26b%3Dc";
    const payload = { model: signedUrl };

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(payload.model).toBe(signedUrl);
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
      "https://api.d.xrteeth.com/uploads/background.mp3"
    );
  });

  it("unwraps historical proxy urls into validated direct urls", () => {
    const target = "https://data.7dgame.com/model.glb?sign=a%26b%3Dc";
    const payload = {
      model: `https://xrugc.com/__xrugc_proxy__?url=${encodeURIComponent(target)}`,
    };

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(payload.model).toBe(target);
  });

  it("upgrades the known legacy COS host without changing its signed query", () => {
    const legacyUrl =
      "http://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/model.glb?token=a%26b%3Dc&part=1&part=2";
    const payload = { model: legacyUrl };

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(payload.model).toBe(
      "https://data.7dgame.com/model.glb?token=a%26b%3Dc&part=1&part=2"
    );
  });

  it("rejects insecure, credentialed and non-allowlisted asset origins", () => {
    for (const url of [
      "http://data.7dgame.com/model.glb",
      "https://user:secret@data.7dgame.com/model.glb",
      "https://attacker.example/model.glb",
      "ftp://attacker.example/model.glb",
      "file:///etc/private.glb",
      "blob:https://attacker.example/resource-id",
    ]) {
      const payload = { model: url };
      expect(() =>
        rewriteUnityPreviewUrls(
          payload,
          "https://xrugc.com",
          "https://api.d.xrteeth.com"
        )
      ).toThrow("WGP-ASSET-DENIED");
    }
  });

  it("validates absolute and protocol-relative urls before extension filtering", () => {
    for (const url of [
      "https://attacker.example/texture.ktx2",
      "https://attacker.example/lighting.hdr",
      "https://attacker.example/environment.exr",
      "https://attacker.example/texture.tga",
      "https://attacker.example/resource-without-extension",
      "//attacker.example/resource-without-extension",
    ]) {
      expect(() =>
        rewriteUnityPreviewUrls(
          { resource: url },
          "https://xrugc.com",
          "https://api.d.xrteeth.com"
        )
      ).toThrow("WGP-ASSET-DENIED");
    }
  });

  it("preserves extensionless absolute urls from an allowlisted origin", () => {
    const url =
      "https://data.7dgame.com/resource?token=a%26b%3Dc&part=1&part=2";
    const payload = { resource: url };

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(payload.resource).toBe(url);
  });

  it("rejects loopback HTTP assets outside local development", () => {
    withWindowLocation(
      { hostname: "app.example.com", protocol: "https:" },
      () => {
        expect(() =>
          rewriteUnityPreviewUrls(
            { model: "http://127.0.0.1:9000/private.glb" },
            "https://xrugc.com",
            "https://api.d.xrteeth.com"
          )
        ).toThrow("WGP-ASSET-DENIED");
      }
    );
  });

  it("allows loopback HTTP assets when the current page is also loopback", () => {
    withWindowLocation({ hostname: "localhost", protocol: "http:" }, () => {
      const payload = { model: "http://127.0.0.1:9000/local.glb" };

      rewriteUnityPreviewUrls(
        payload,
        "http://localhost:3006",
        "http://localhost:8081"
      );

      expect(payload.model).toBe("http://127.0.0.1:9000/local.glb");
    });
  });

  it("rejects denied urls hidden behind JSON unicode escapes", () => {
    const payload = {
      data: String.raw`{"model":"https:\u002f\u002fattacker.example/model.glb"}`,
    };

    expect(() =>
      rewriteUnityPreviewUrls(
        payload,
        "https://xrugc.com",
        "https://api.d.xrteeth.com"
      )
    ).toThrow("WGP-ASSET-DENIED");
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
    expect((payload as typeof source).data).toContain(
      "https://api.d.xrteeth.com/assets/demo.glb"
    );
    expect((payload as typeof source).data).not.toContain("/__xrugc_proxy__");
  });

  it("parses json scene data when possible", () => {
    expect(normalizeUnityPreviewData('{"foo":1}')).toEqual({ foo: 1 });
    expect(normalizeUnityPreviewData("plain text")).toBe("plain text");
  });
});
