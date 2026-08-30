import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("responsive editor header regression", () => {
  const navbarSource = readSource("src/layout/components/NavBar/index.vue");
  const breadcrumbSource = readSource(
    "src/layout/components/NavBar/components/Breadcrumb.vue"
  );
  const headerActionsSource = readSource(
    "src/layout/components/NavBar/components/HeaderActions.vue"
  );
  const userDropdownSource = readSource(
    "src/layout/components/NavBar/components/UserDropdown.vue"
  );
  const versionToolbarSource = readSource(
    "src/layout/components/NavBar/components/EditorVersionToolbar.vue"
  );
  const verseScriptSource = readSource("src/views/verse/script.vue");
  const metaScriptSource = readSource("src/views/meta/script.vue");
  const publicLanguageSources = [
    readSource("src/views/login/index.vue"),
    readSource("src/views/register/index.vue"),
    readSource("src/views/site/index.vue"),
    readSource("src/views/web/index.vue"),
    readSource("src/layout/components/NavBar/components/NavbarRight.vue"),
  ];

  it("uses a named container and removes low-priority navbar content at compact widths", () => {
    expect(navbarSource).toContain("container-name: app-navbar");
    expect(navbarSource).toContain("@container app-navbar (width <= 1320px)");
    expect(navbarSource).toContain(".navbar-identity");
    expect(breadcrumbSource).toContain("flex-wrap: nowrap");
    expect(breadcrumbSource).toContain(".crumb-link:not(.is-primary)");
  });

  it("uses viewport width for compact account actions while keeping both presentations accessible", () => {
    expect(headerActionsSource).toContain('class="compact-actions-dropdown"');
    expect(headerActionsSource).toContain("handleCompactCommand");
    expect(headerActionsSource).toContain(
      ":aria-label=\"t('ui.moreActions')\""
    );
    expect(headerActionsSource).toContain("@media (width <= 1280px)");
    expect(headerActionsSource).not.toContain(
      "@container app-navbar (width <= 1200px)"
    );
    expect(userDropdownSource).toContain("@media (width <= 1280px)");
    expect(userDropdownSource).not.toContain(
      "@container app-navbar (width <= 1200px)"
    );
  });

  it("always exposes theme and language choices instead of domain-locking them", () => {
    expect(headerActionsSource).toContain('class="theme-dropdown"');
    expect(headerActionsSource).toContain('class="language-dropdown"');
    expect(headerActionsSource).not.toContain("isStyleLocked");
    expect(headerActionsSource).not.toContain("isLanguageLocked");
    for (const source of publicLanguageSources) {
      expect(source).not.toContain("isLanguageLocked");
    }
  });

  it("continues to compact version controls by available navbar width", () => {
    expect(versionToolbarSource).toContain('class="entry-label"');
    expect(versionToolbarSource).toContain(
      "@container app-navbar (width <= 1200px)"
    );
  });

  it.each([
    ["Verse", verseScriptSource],
    ["Entity", metaScriptSource],
  ])(
    "uses a collision-free responsive toolbar in the %s script editor",
    (_, source) => {
      expect(source).toContain('class="script-editor-toolbar"');
      expect(source).toContain('class="script-mode-tabs"');
      expect(source).toContain("container-name: script-editor");
      expect(source).toContain("@container script-editor (width <= 1100px)");
      expect(source).toContain("@container script-editor (width <= 620px)");
      expect(source).not.toContain("padding-right: 460px");
      expect(source).not.toMatch(
        /\.script-tabs-actions\s*\{[^}]*position:\s*absolute/s
      );
    }
  );

  it.each([
    ["Verse", verseScriptSource],
    ["Entity", metaScriptSource],
  ])(
    "keeps Save directly represented in the %s responsive toolbar",
    (_, source) => {
      expect(source).toContain("script-save-button");
      expect(source).toContain('icon="save"');
    }
  );
});
