/**
 * Unit tests for src/directive/highlight.ts
 * Tests the beforeMount and updated lifecycle hooks of the highlight directive.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock highlight.js before importing the directive
const mockHighlightElement = vi.hoisted(() => vi.fn());
const mockRegisterLanguage = vi.hoisted(() => vi.fn());

vi.mock("highlight.js", () => ({
  default: {
    registerLanguage: mockRegisterLanguage,
    highlightElement: mockHighlightElement,
  },
}));
vi.mock("highlight.js/lib/languages/lua", () => ({ default: {} }));
vi.mock("highlight.js/lib/languages/javascript", () => ({ default: {} }));
vi.mock("highlight.js/styles/github.css", () => ({}));
vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("highlightDirective", () => {
  let directive: typeof import("@/directive/highlight").default;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    directive = (await import("@/directive/highlight")).default;
  });

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------
  it("registers lua language on import", () => {
    expect(mockRegisterLanguage).toHaveBeenCalledWith("lua", expect.anything());
  });

  it("registers javascript language on import", () => {
    expect(mockRegisterLanguage).toHaveBeenCalledWith(
      "javascript",
      expect.anything()
    );
  });

  // -------------------------------------------------------------------------
  // beforeMount
  // -------------------------------------------------------------------------
  describe("beforeMount", () => {
    it("calls highlightElement for each <pre><code> block", () => {
      const el = document.createElement("div");
      el.innerHTML = `
        <pre><code>const x = 1;</code></pre>
        <pre><code>local y = 2</code></pre>
      `;
      const blocks = el.querySelectorAll("pre code");

      directive.beforeMount!(el, {} as any, {} as any, {} as any);

      expect(mockHighlightElement).toHaveBeenCalledTimes(blocks.length);
    });

    it("does nothing when no <pre><code> blocks exist", () => {
      const el = document.createElement("div");
      el.innerHTML = "<p>plain text</p>";

      directive.beforeMount!(el, {} as any, {} as any, {} as any);

      expect(mockHighlightElement).not.toHaveBeenCalled();
    });

    it("passes the exact code element to highlightElement", () => {
      const el = document.createElement("div");
      el.innerHTML = "<pre><code id='target'>code here</code></pre>";
      const codeEl = el.querySelector("code")!;

      directive.beforeMount!(el, {} as any, {} as any, {} as any);

      expect(mockHighlightElement).toHaveBeenCalledWith(codeEl);
    });

    it("calls logger.log with blocks", async () => {
      const { logger } = await import("@/utils/logger");
      const el = document.createElement("div");
      el.innerHTML = "<pre><code>lua</code></pre>";

      directive.beforeMount!(el, {} as any, {} as any, {} as any);

      expect(logger.log).toHaveBeenCalledWith("blocks", expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  // updated
  // -------------------------------------------------------------------------
  describe("updated", () => {
    it("calls highlightElement for each <pre><code> block on update", () => {
      const el = document.createElement("div");
      el.innerHTML = "<pre><code>updated code</code></pre>";

      directive.updated!(el, {} as any, {} as any, {} as any);

      expect(mockHighlightElement).toHaveBeenCalledTimes(1);
    });

    it("does nothing when no blocks on update", () => {
      const el = document.createElement("div");
      el.innerHTML = "<p>no code</p>";

      directive.updated!(el, {} as any, {} as any, {} as any);

      expect(mockHighlightElement).not.toHaveBeenCalled();
    });

    it("highlights all three blocks independently on update", () => {
      const el = document.createElement("div");
      el.innerHTML = `
        <pre><code>a</code></pre>
        <pre><code>b</code></pre>
        <pre><code>c</code></pre>
      `;

      directive.updated!(el, {} as any, {} as any, {} as any);

      expect(mockHighlightElement).toHaveBeenCalledTimes(3);
    });

    it("does not highlight code blocks outside of pre elements", () => {
      const el = document.createElement("div");
      el.innerHTML =
        "<code>plain code</code><pre><code>real block</code></pre>";

      directive.updated!(el, {} as any, {} as any, {} as any);

      // Only the `pre code` block should be highlighted, not bare `code`
      expect(mockHighlightElement).toHaveBeenCalledTimes(1);
    });
  });

  it("directive has beforeMount and updated hooks", () => {
    expect(typeof directive.beforeMount).toBe("function");
    expect(typeof directive.updated).toBe("function");
  });

  it("registerLanguage is called exactly twice (lua + javascript)", () => {
    expect(mockRegisterLanguage).toHaveBeenCalledTimes(2);
  });
});
