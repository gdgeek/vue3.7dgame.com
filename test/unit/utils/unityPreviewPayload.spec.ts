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
  const rewriteRuntime = (payload: unknown) =>
    rewriteUnityPreviewUrls(
      payload,
      "https://d.xrugc.com",
      "https://d.xrugc.com",
      { restrictToRuntimeOrigins: true }
    );

  it("preserves content revisions on scene 408 and nested entities", () => {
    const serverRevision = `sha256:${"a".repeat(64)}`;
    const payload = {
      scene: { id: 408, serverRevision },
      metas: [{ serverRevision, data: JSON.stringify({ serverRevision }) }],
    };
    const expected = structuredClone(payload);
    rewriteRuntime(payload);
    expect(payload).toEqual(expected);
  });

  it("preserves API identifiers, file fingerprints and plain text info", () => {
    const payload = {
      uuid: "urn:uuid:example",
      info: "备注: 详情见 https://example.org/model.glb",
      file: {
        type: "model/gltf-binary",
        md5: "md5:0123456789abcdef",
        url: "https://data.7dgame.com/model.glb",
      },
    };
    const expected = structuredClone(payload);
    rewriteRuntime(payload);
    expect(payload).toEqual(expected);
  });

  it("does not mistake Lua method calls or JavaScript labels for URL schemes", () => {
    const payload = {
      metas: [
        {
          code: "self:initialize()",
          script: "self:initialize()",
          metaCode: "self:initialize()",
        },
      ],
      verseCode: "self:initialize()",
      script: {
        lua: "self:initialize()",
        javascript: "start: for (;;) break start;",
      },
    };
    const expected = structuredClone(payload);
    rewriteRuntime(payload);
    expect(payload).toEqual(expected);
  });

  it("preserves Blockly namespaces and still normalizes embedded asset URLs", () => {
    const url =
      "http://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/model.glb?sign=a%26b&part=1&part=2";
    const payload = {
      metas: [
        {
          metaCode: {
            blockly: `<xml xmlns="https://developers.google.com/blockly/xml"><field name="URL">${url}</field></xml>`,
            lua: `self:load("${url}")`,
            js: `load("${url}")`,
          },
        },
      ],
    };
    rewriteRuntime(payload);
    const code = payload.metas[0].metaCode;
    expect(code.blockly).toContain(
      'xmlns="https://developers.google.com/blockly/xml"'
    );
    for (const value of Object.values(code)) {
      expect(value).toContain(
        "https://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/model.glb?sign=a%26b&part=1&part=2"
      );
    }
  });

  it.each([
    "https://private.example/model.glb",
    "http://data.7dgame.com/model.glb",
    "https://user:password@data.7dgame.com/model.glb",
  ])("still rejects actual URLs in code and structured metadata: %s", (url) => {
    for (const payload of [
      { serverRevision: "sha256:abc", resources: [{ file: { url } }] },
      { serverRevision: { file: { url } } },
      { uuid: { url } },
      { info: JSON.stringify({ file: { url } }) },
      { info: { file: { url } } },
      { metas: [{ metaCode: { lua: `self:load("${url}")` } }] },
      { script: { javascript: `load("${url}")` } },
      {
        blockly: `<xml xmlns="https://developers.google.com/blockly/xml"><field name="URL">${url}</field></xml>`,
      },
      { data: JSON.stringify({ code: { file: { url } } }) },
    ]) {
      expect(() => rewriteRuntime(payload)).toThrow("WGP-ASSET-DENIED");
    }
  });

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
      url: file.url,
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

  it("upgrades legacy COS to HTTPS without moving its signed query to the CDN", () => {
    const legacyUrl =
      "http://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/model.glb?token=a%26b%3Dc&part=1&part=2";
    const payload = { model: legacyUrl };

    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.d.xrteeth.com"
    );

    expect(payload.model).toBe(
      "https://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com/model.glb?token=a%26b%3Dc&part=1&part=2"
    );
  });

  it("reads public hash-named CDN audio from COS including nested serialized data", () => {
    const path = "/audio/d03660c8c37eff4ffc5983d6ee4dc8df.wav";
    const audio = `https://data.7dgame.com${path}`;
    const payload = {
      resources: [{ url: audio }],
      data: JSON.stringify({ audio }),
      proxy: `https://xrugc.com/__xrugc_proxy__?url=${encodeURIComponent(audio)}`,
    };
    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.xrugc.com"
    );
    const expected = `https://7dgame-public-1251022382.cos.ap-nanjing.myqcloud.com${path}`;
    expect(payload.resources[0].url).toBe(expected);
    expect(JSON.parse(payload.data).audio).toBe(expected);
    expect(payload.proxy).toBe(expected);
  });

  it("does not bypass CDN queries, other paths, or other buckets", () => {
    const audio =
      "https://data.7dgame.com/audio/d03660c8c37eff4ffc5983d6ee4dc8df.wav";
    const urls = [
      `${audio}?sign=a%26b&part=1&part=2`,
      `${audio}?`,
      "https://data.7dgame.com/audio/background.wav",
      "https://data.7dgame.com/model/d03660c8c37eff4ffc5983d6ee4dc8df.glb",
      "https://mrpp-1257979353.cos.ap-chengdu.myqcloud.com/audio/d03660c8c37eff4ffc5983d6ee4dc8df.wav",
    ];
    const payload = { urls: [...urls] };
    rewriteUnityPreviewUrls(
      payload,
      "https://xrugc.com",
      "https://api.xrugc.com"
    );
    expect(payload.urls).toEqual(urls);
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
          url: legacyModel,
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
