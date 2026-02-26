/**
 * Unit tests for src/styles/themes/index.ts
 * Covers pure, deterministic functions:
 *   - generateModernColors  (hex → ColorVariables)
 *   - generatePrimaryShadow (hex → CSS shadow string)
 *   - getTheme              (name lookup in theme registry)
 *   - defaultTheme / themes (registry integrity)
 */
import { describe, it, expect } from "vitest";
import {
  generateModernColors,
  generatePrimaryShadow,
  getTheme,
  themes,
  defaultTheme,
} from "@/styles/themes/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Hex component → number 0-255 */
const hex2int = (hex: string) => parseInt(hex, 16);

/** Parse "#rrggbb" → { r, g, b } */
function parseHex(color: string) {
  const h = color.replace("#", "");
  return {
    r: hex2int(h.slice(0, 2)),
    g: hex2int(h.slice(2, 4)),
    b: hex2int(h.slice(4, 6)),
  };
}

// ---------------------------------------------------------------------------
// generatePrimaryShadow
// ---------------------------------------------------------------------------
describe("generatePrimaryShadow()", () => {
  it("returns a CSS box-shadow string", () => {
    const result = generatePrimaryShadow("#409EFF");
    expect(typeof result).toBe("string");
    expect(result).toMatch(/rgba\(/);
  });

  it("embeds parsed r, g, b values for #FF6B35", () => {
    const result = generatePrimaryShadow("#FF6B35");
    expect(result).toBe("0 8px 20px -4px rgba(255, 107, 53, 0.3)");
  });

  it("embeds correct values for pure red #FF0000", () => {
    expect(generatePrimaryShadow("#FF0000")).toBe(
      "0 8px 20px -4px rgba(255, 0, 0, 0.3)"
    );
  });

  it("embeds correct values for pure blue #0000FF", () => {
    expect(generatePrimaryShadow("#0000FF")).toBe(
      "0 8px 20px -4px rgba(0, 0, 255, 0.3)"
    );
  });

  it("handles black #000000", () => {
    expect(generatePrimaryShadow("#000000")).toBe(
      "0 8px 20px -4px rgba(0, 0, 0, 0.3)"
    );
  });

  it("handles white #FFFFFF", () => {
    expect(generatePrimaryShadow("#FFFFFF")).toBe(
      "0 8px 20px -4px rgba(255, 255, 255, 0.3)"
    );
  });

  it("shadow includes 0.3 opacity", () => {
    const result = generatePrimaryShadow("#123456");
    expect(result).toContain("0.3");
  });
});

// ---------------------------------------------------------------------------
// generateModernColors
// ---------------------------------------------------------------------------
describe("generateModernColors()", () => {
  describe("primary color propagation", () => {
    it("primary equals the input color", () => {
      const { primary } = generateModernColors("#409EFF");
      expect(primary).toBe("#409EFF");
    });

    it("primaryLight is an rgba with 0.1 alpha", () => {
      const { primaryLight } = generateModernColors("#FF0000");
      expect(primaryLight).toMatch(/rgba\(255,\s*0,\s*0,\s*0\.1\)/);
    });

    it("primaryGradient contains the original and hover colors", () => {
      const { primaryGradient, primaryHover } = generateModernColors("#FF6B35");
      expect(primaryGradient).toContain("#FF6B35");
      expect(primaryGradient).toContain(primaryHover);
    });
  });

  describe("hover color (15% darker)", () => {
    it("hover of #FF6B35 is #d95b2d", () => {
      const { primaryHover } = generateModernColors("#FF6B35");
      expect(primaryHover).toBe("#d95b2d");
    });

    it("hover of #FFFFFF is #d9d9d9", () => {
      const { primaryHover } = generateModernColors("#FFFFFF");
      expect(primaryHover).toBe("#d9d9d9");
    });

    it("hover of #000000 stays #000000 (floor at 0)", () => {
      const { primaryHover } = generateModernColors("#000000");
      expect(primaryHover).toBe("#000000");
    });

    it("hover color components are darker than the input", () => {
      const input = "#409EFF";
      const { r: ir, g: ig, b: ib } = parseHex(input);
      const { primaryHover } = generateModernColors(input);
      const { r: hr, g: hg, b: hb } = parseHex(primaryHover);
      // Each channel should be ≤ input (darker or equal)
      expect(hr).toBeLessThanOrEqual(ir);
      expect(hg).toBeLessThanOrEqual(ig);
      expect(hb).toBeLessThanOrEqual(ib);
    });
  });

  describe("dark color (30% darker)", () => {
    it("dark of #FF6B35 is #b34b25", () => {
      const { primaryDark } = generateModernColors("#FF6B35");
      expect(primaryDark).toBe("#b34b25");
    });

    it("dark of #FFFFFF is #b3b3b3", () => {
      const { primaryDark } = generateModernColors("#FFFFFF");
      expect(primaryDark).toBe("#b3b3b3");
    });

    it("dark is darker than hover", () => {
      const { primaryHover, primaryDark } = generateModernColors("#409EFF");
      const { r: hr, g: hg, b: hb } = parseHex(primaryHover);
      const { r: dr, g: dg, b: db } = parseHex(primaryDark);
      // Dark must be ≤ hover in every channel
      expect(dr).toBeLessThanOrEqual(hr);
      expect(dg).toBeLessThanOrEqual(hg);
      expect(db).toBeLessThanOrEqual(hb);
    });
  });

  describe("fixed colors", () => {
    it("secondary is #6366f1 regardless of input", () => {
      const a = generateModernColors("#FF0000");
      const b = generateModernColors("#00FF00");
      expect(a.secondary).toBe("#6366f1");
      expect(b.secondary).toBe("#6366f1");
    });

    it("accent is #f59e0b", () => {
      expect(generateModernColors("#000000").accent).toBe("#f59e0b");
    });

    it("textInverse is always white", () => {
      expect(generateModernColors("#FF0000").textInverse).toBe("#ffffff");
    });

    it("danger is always #ef4444", () => {
      expect(generateModernColors("#FF0000").danger).toBe("#ef4444");
    });

    it("success is always #22c55e", () => {
      expect(generateModernColors("#FF0000").success).toBe("#22c55e");
    });
  });

  describe("infoLight uses input RGB", () => {
    it("infoLight of #FF0000 contains 255, 0, 0", () => {
      const { infoLight } = generateModernColors("#FF0000");
      expect(infoLight).toMatch(/255/);
      expect(infoLight).toContain("0.1");
    });
  });

  describe("borderColorActive", () => {
    it("borderColorActive equals the primary color", () => {
      const color = "#12AB34";
      expect(generateModernColors(color).borderColorActive).toBe(color);
    });
  });
});

// ---------------------------------------------------------------------------
// getTheme
// ---------------------------------------------------------------------------
describe("getTheme()", () => {
  it("returns the modern-blue theme", () => {
    const theme = getTheme("modern-blue");
    expect(theme).toBeDefined();
    expect(theme!.name).toBe("modern-blue");
  });

  it("returns the deep-space (dark) theme", () => {
    const theme = getTheme("deep-space");
    expect(theme).toBeDefined();
    expect(theme!.isDark).toBe(true);
  });

  it("returns undefined for an unknown theme name", () => {
    expect(getTheme("nonexistent-theme")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getTheme("")).toBeUndefined();
  });

  it("all theme names in the registry are retrievable", () => {
    themes.forEach((t) => {
      expect(getTheme(t.name)).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// themes registry integrity
// ---------------------------------------------------------------------------
describe("themes registry", () => {
  it("has at least one theme", () => {
    expect(themes.length).toBeGreaterThan(0);
  });

  it("every theme has required fields (name, displayName, isDark, style, colors)", () => {
    themes.forEach((t) => {
      expect(typeof t.name).toBe("string");
      expect(typeof t.displayName).toBe("string");
      expect(typeof t.isDark).toBe("boolean");
      expect(t.style).toBeDefined();
      expect(t.colors).toBeDefined();
    });
  });

  it("theme names are unique", () => {
    const names = themes.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("there is at least one light theme and one dark theme", () => {
    const hasLight = themes.some((t) => !t.isDark);
    const hasDark = themes.some((t) => t.isDark);
    expect(hasLight).toBe(true);
    expect(hasDark).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// defaultTheme
// ---------------------------------------------------------------------------
describe("defaultTheme", () => {
  it("is the first theme in the registry", () => {
    expect(defaultTheme).toBe(themes[0]);
  });

  it("is named modern-blue", () => {
    expect(defaultTheme.name).toBe("modern-blue");
  });

  it("is a light theme", () => {
    expect(defaultTheme.isDark).toBe(false);
  });
});
