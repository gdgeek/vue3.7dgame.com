import { describe, expect, it } from "vitest";
import {
  extractUnityPreviewLuaActions,
  normalizeUnityPreviewMetaLua,
  normalizeUnityPreviewVerseLua,
  readUnityPreviewMetaJavaScriptCode,
  readUnityPreviewMetaLuaCode,
} from "@/utils/unityPreviewLua";

describe("unityPreviewLua", () => {
  it("binds meta action handlers to the global table for Unity lookup", () => {
    const result = normalizeUnityPreviewMetaLua(
      "meta['@action-id'] = function(parameter)\nend\n"
    );

    expect(result).toContain("_G.meta = _G.meta or {}");
    expect(result).toContain("local meta = _G.meta");
    expect(result).toContain("meta['@action-id']");
  });

  it("replaces the old local-only meta guard", () => {
    const result = normalizeUnityPreviewMetaLua(
      "local meta = meta or {}\nmeta['@action-id'] = function(parameter)\nend\n"
    );

    expect(result).toContain("_G.meta = _G.meta or {}");
    expect(result).toContain("local meta = _G.meta");
    expect(result).not.toContain("local meta = meta or {}");
  });

  it("replaces the editor runtime local table and index guards", () => {
    const result = normalizeUnityPreviewVerseLua(
      "local verse = {}\nlocal index = ''\nverse['#signal-id'] = function(parameter)\nend\n"
    );

    expect(result).toContain("_G.verse = _G.verse or {}");
    expect(result).toContain("local verse = _G.verse");
    expect(result).not.toContain("local verse = {}");
    expect(result).not.toContain("local index = ''");
    expect(result).toContain("verse['#signal-id']");
  });

  it("keeps meaningful local index assignments used by generated handlers", () => {
    const result = normalizeUnityPreviewMetaLua(
      "local meta = {}\nlocal index = '@action-id'\nmeta[index] = function(parameter)\nend\n"
    );

    expect(result).toContain("local meta = _G.meta");
    expect(result).toContain("local index = '@action-id'");
    expect(result).toContain("meta[index]");
  });

  it("binds verse signal handlers to the global table for Unity lookup", () => {
    const result = normalizeUnityPreviewVerseLua(
      "verse['#signal-id'] = function(parameter)\nend\n"
    );

    expect(result).toContain("_G.verse = _G.verse or {}");
    expect(result).toContain("local verse = _G.verse");
    expect(result).toContain("verse['#signal-id']");
  });

  it("does not duplicate an existing global table preamble", () => {
    const code = "_G.meta = _G.meta or {}\nlocal meta = _G.meta\nprint('ok')";

    expect(normalizeUnityPreviewMetaLua(code)).toBe(code);
  });

  it("extracts non-init meta and verse actions for preview diagnostics", () => {
    expect(
      extractUnityPreviewLuaActions(
        "meta['@init'] = function() end\nmeta['@按钮_牛黄'] = function() end\nverse[\"#signal\"] = function() end\nmeta['@按钮_牛黄'] = function() end"
      )
    ).toEqual(["@按钮_牛黄", "#signal"]);
  });

  it("extracts local index action handlers for preview diagnostics", () => {
    expect(
      extractUnityPreviewLuaActions(
        "local index = '@按钮_杜仲'\nmeta[index] = function(parameter)\nend"
      )
    ).toEqual(["@按钮_杜仲"]);
  });

  it("reads meta code from expanded backend code relations", () => {
    const meta = {
      code: {
        lua: "meta['@lua-action'] = function() end",
        js: "meta['@js-action'] = async function() {}",
      },
    };

    expect(readUnityPreviewMetaLuaCode(meta)).toContain("@lua-action");
    expect(readUnityPreviewMetaJavaScriptCode(meta)).toContain("@js-action");
  });
});
