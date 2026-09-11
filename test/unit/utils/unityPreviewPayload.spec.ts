import { describe, expect, it } from "vitest";
import {
  cloneForUnityPreview,
  normalizeUnityPreviewData,
  rewriteUnityPreviewUrls,
  UnityPreviewAssetError,
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
  it("preserves scene 506 file storage keys and filenames while validating download URLs", () => {
    const file = {
      key: "/ai/polygen/model.glb",
      filename: "Polygen:model.glb",
      url: "https://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/ai/polygen/model.glb?sign=a%26b&part=1&part=2",
    };
    const image = {
      key: "/screenshot/polygen/model.jpg",
      filename: "preview.jpg",
      url: "https://data.7dgame.com/screenshot/polygen/model.jpg",
    };
    const resource = { name: "Polygen:model.glb", file, image };
    const source = {
      resources: [resource],
      metas: [
        { resources: [resource], data: JSON.stringify({ fileData: file }) },
      ],
    };
    const payload = structuredClone(source);
    rewriteUnityPreviewUrls(
      payload,
      "https://d.dev.xrugc.com",
      "https://d.dev.xrugc.com",
      { restrictToRuntimeOrigins: true }
    );
    const expectedFile = {
      ...file,
      url: file.url.replace(
        "7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com",
        "data.7dgame.com"
      ),
    };
    expect(payload.resources[0].file).toEqual(expectedFile);
    expect(payload.resources[0].image).toEqual(image);
    expect(payload.metas[0].resources[0].file).toEqual(expectedFile);
    expect(JSON.parse(payload.metas[0].data).fileData).toEqual(expectedFile);
    expect(source.resources[0].file).toEqual(file);
  });

  it.each([
    "http://data.7dgame.com/model.glb",
    "https://private.example/model.glb",
    "file:///private/model.glb",
  ])(
    "still rejects a denied file URL beside preserved storage metadata: %s",
    (url) => {
      expect(() =>
        rewriteUnityPreviewUrls(
          {
            resources: [
              {
                file: {
                  key: "/ai/polygen/model.glb",
                  filename: "Polygen:model.glb",
                  url,
                },
              },
            ],
          },
          "https://d.dev.xrugc.com",
          "https://d.dev.xrugc.com",
          { restrictToRuntimeOrigins: true }
        )
      ).toThrow("WGP-ASSET-DENIED");
    }
  );

  it("does not skip structured data stored under a file metadata key", () => {
    expect(() =>
      rewriteUnityPreviewUrls(
        {
          file: {
            url: "https://data.7dgame.com/model.glb",
            key: { url: "https://private.example/model.glb" },
          },
        },
        "https://d.dev.xrugc.com",
        "https://d.dev.xrugc.com",
        { restrictToRuntimeOrigins: true }
      )
    ).toThrow("WGP-ASSET-DENIED");
  });

  it("identifies denied nested JSON fields without exposing URL secrets", () => {
    const payload = {
      metas: [
        {
          data: JSON.stringify({
            file: {
              url: "https://user:password@private.example/secret-model.glb?token=secret#private",
            },
          }),
        },
      ],
    };
    let denied: unknown;
    try {
      rewriteUnityPreviewUrls(
        payload,
        "https://app.example",
        "https://api.example",
        { restrictToRuntimeOrigins: true }
      );
    } catch (error) {
      denied = error;
    }
    expect(denied).toBeInstanceOf(UnityPreviewAssetError);
    expect(denied).toMatchObject({
      fields: ["metas", "0", "data", "file", "url"],
      origin: "https://private.example",
      reason: "credentials",
    });
    const diagnostic = JSON.stringify(denied);
    for (const secret of ["password", "secret-model", "token=", "#private"])
      expect(diagnostic).not.toContain(secret);
  });

  it("redacts arbitrary field keys and opaque URL contents from denial diagnostics", () => {
    try {
      rewriteUnityPreviewUrls(
        { "https://private.example/?token=secret": ["data:secret"] },
        "https://app.example",
        "https://api.example"
      );
      expect.fail("must reject unsupported schemes");
    } catch (error) {
      expect(error).toMatchObject({
        fields: ["[field]", "0"],
        origin: null,
        reason: "scheme",
      });
      expect(JSON.stringify(error)).not.toContain("secret");
    }
  });

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

  describe("built-in runtime origin restriction", () => {
    const options = { restrictToRuntimeOrigins: true };
    const rewrite = (payload: unknown) =>
      rewriteUnityPreviewUrls(
        payload,
        "http://localhost:3016",
        "http://localhost:8081",
        options
      );

    it("keeps scene 506 metadata as text while preparing its model URL", () => {
      const legacyModel =
        "https://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/ai/polygen/model.glb?sign=a%2Fb%3D&part=2&part=1";
      const title = "Polygen:脱口秀小朋友.glb";
      const description = "详情见 https://www.example.org/about";
      const payload = {
        scene: { id: 506, name: title, description },
        metas: [
          {
            name: title,
            data: JSON.stringify({ name: title, title, description }),
            resources: [{ name: title, file: { url: legacyModel } }],
          },
        ],
      };

      rewrite(payload);

      expect(payload.scene).toEqual({ id: 506, name: title, description });
      expect(payload.metas[0].name).toBe(title);
      expect(JSON.parse(payload.metas[0].data)).toEqual({
        name: title,
        title,
        description,
      });
      expect(payload.metas[0].resources[0]).toEqual({
        name: title,
        file: {
          url: legacyModel.replace(
            "7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com",
            "data.7dgame.com"
          ),
        },
      });
    });

    it.each([
      "https://attacker.example/model.glb",
      "ftp://attacker.example/model.glb",
      "file:///private/model.glb",
      "blob:https://attacker.example/resource-id",
      "data:model/gltf-binary;base64,AAAA",
      "javascript:alert(1)",
    ])(
      "still rejects actual resource URLs beside display metadata: %s",
      (url) => {
        for (const payload of [
          { name: "Polygen:模型", resources: [{ file: { url } }] },
          { data: JSON.stringify({ title: "Model:preview", file: { url } }) },
          { name: { file: { url } } },
        ]) {
          expect(() => rewrite(payload)).toThrow("WGP-ASSET-DENIED");
        }
      }
    );

    it.each([
      "https://data.7dgame.com/model.glb?token=a%26b%3Dc&part=1&part=2",
      "https://mrpp-1257979353.cos.ap-chengdu.myqcloud.com/image.png?sign=a%2Fb%3D&part=2&part=1",
    ])("preserves approved signed CDN asset byte-for-byte: %s", (url) => {
      const payload = {
        resources: [{ file: { url } }],
        data: JSON.stringify({ model: url }),
      };
      rewrite(payload);
      expect(payload.resources[0].file.url).toBe(url);
      expect(JSON.parse(payload.data).model).toBe(url);
    });

    it.each([
      "http://localhost:8081/uploads/model.glb",
      "http://127.0.0.1:8081/uploads/model.glb",
      "https://api.example.com/uploads/model.glb",
      "/uploads/model.glb",
    ])("rejects API/local resources during strict preparation: %s", (url) => {
      withWindowLocation({ hostname: "localhost", protocol: "http:" }, () => {
        const payload = { resources: [{ file: { url } }] };
        expect(() =>
          rewriteUnityPreviewUrls(
            payload,
            "https://app.example.com",
            "https://api.example.com",
            options
          )
        ).toThrow("WGP-ASSET-DENIED");
      });
    });

    it("keeps the strict policy through encoded JSON, arrays and legacy proxy aliases", () => {
      const target = "http://localhost:8081/uploads/model.glb";
      for (const payload of [
        { data: JSON.stringify({ model: target }) },
        { data: [target] },
        {
          model: `http://localhost:3016/__xrugc_proxy__?url=${encodeURIComponent(target)}`,
        },
      ])
        expect(() => rewrite(payload)).toThrow("WGP-ASSET-DENIED");
    });

    it("keeps non-resource relative API references and ordinary payload metadata unchanged", () => {
      const payload = {
        scene: { id: 42, source: "xrugc-web-scene-editor" },
        route: "/v1/verses/42",
        script: 'print("scene ready")',
      };
      const before = structuredClone(payload);
      rewrite(payload);
      expect(payload).toEqual(before);
    });
  });

  it("parses json scene data when possible", () => {
    expect(normalizeUnityPreviewData('{"foo":1}')).toEqual({ foo: 1 });
    expect(normalizeUnityPreviewData("plain text")).toBe("plain text");
  });
});
