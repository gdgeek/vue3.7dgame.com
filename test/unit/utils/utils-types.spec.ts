/**
 * Unit tests for:
 *   src/utils/types.ts          – CardInfo, DataInput, DataOutput
 *   src/components/JsonSchemaForm/types.ts – JsonSchema*, FormFooterConfig
 *   src/components/MrPP/CardListPage/types.ts – CardInfo (mrpp variant)
 */
import { describe, it, expect } from "vitest";

// ============================================================================
// src/utils/types.ts
// ============================================================================
describe("src/utils/types.ts – runtime type contracts", () => {
  it("CardInfo accepts all required fields", () => {
    const card: import("@/utils/types").CardInfo = {
      id: 1,
      image: { url: "https://example.com/img.png" },
      type: "scene",
      created_at: "2024-01-01T00:00:00Z",
      name: "My Scene",
      context: {},
      enabled: true,
    };
    expect(card.id).toBe(1);
    expect(card.image).not.toBeNull();
    expect(card.enabled).toBe(true);
  });

  it("CardInfo.image can be null", () => {
    const card: import("@/utils/types").CardInfo = {
      id: 2,
      image: null,
      type: "audio",
      created_at: "2024-01-01",
      name: "Audio",
      context: "any",
      enabled: false,
    };
    expect(card.image).toBeNull();
  });

  it("CardInfo.image can include an optional id", () => {
    const card: import("@/utils/types").CardInfo = {
      id: 3,
      image: { id: 99, url: "https://example.com/x.jpg" },
      type: "video",
      created_at: "2024-02-01",
      name: "Video",
      context: null,
      enabled: true,
    };
    expect(card.image?.id).toBe(99);
  });

  it("DataInput holds type, sorted, searched and current page", () => {
    const input: import("@/utils/types").DataInput = {
      type: "scene",
      sorted: "-created_at",
      searched: "keyword",
      current: 1,
    };
    expect(input.current).toBe(1);
    expect(input.sorted).toBe("-created_at");
  });

  it("DataOutput holds items array and pagination", () => {
    const output: import("@/utils/types").DataOutput = {
      items: [],
      pagination: { current: 1, count: 0, size: 10, total: 0 },
    };
    expect(output.items).toHaveLength(0);
    expect(output.pagination.size).toBe(10);
  });

  it("DataOutput pagination tracks total correctly", () => {
    const output: import("@/utils/types").DataOutput = {
      items: [
        {
          id: 1,
          image: null,
          type: "scene",
          created_at: "",
          name: "S1",
          context: {},
          enabled: true,
        },
      ],
      pagination: { current: 2, count: 5, size: 10, total: 50 },
    };
    expect(output.pagination.total).toBe(50);
    expect(output.pagination.count).toBe(5);
    expect(output.items).toHaveLength(1);
  });
});

// ============================================================================
// src/components/JsonSchemaForm/types.ts
// ============================================================================
describe("src/components/JsonSchemaForm/types.ts – schema contracts", () => {
  it("JsonSchemaBase accepts type and title", () => {
    const schema: import("@/components/JsonSchemaForm/types").JsonSchemaBase = {
      type: "string",
      title: "Name",
    };
    expect(schema.type).toBe("string");
    expect(schema.title).toBe("Name");
  });

  it("JsonSchemaObject has type 'object' with optional properties", () => {
    const schema: import("@/components/JsonSchemaForm/types").JsonSchemaObject =
      {
        type: "object",
        properties: {
          age: { type: "number" },
        },
      };
    expect(schema.type).toBe("object");
    expect(schema.properties?.age?.type).toBe("number");
  });

  it("JsonSchemaArray has type 'array' with optional items", () => {
    const schema: import("@/components/JsonSchemaForm/types").JsonSchemaArray =
      {
        type: "array",
        items: { type: "string" },
      };
    expect(schema.type).toBe("array");
    expect(schema.items?.type).toBe("string");
  });

  it("JsonSchemaBase supports validation fields", () => {
    const schema: import("@/components/JsonSchemaForm/types").JsonSchemaBase = {
      type: "string",
      minLength: 2,
      maxLength: 50,
      required: ["name"],
    };
    expect(schema.minLength).toBe(2);
    expect(schema.maxLength).toBe(50);
  });

  it("JsonSchemaBase supports ui extension fields", () => {
    const schema: import("@/components/JsonSchemaForm/types").JsonSchemaBase = {
      "ui:widget": "textarea",
      "ui:hidden": true,
      "ui:options": { rows: 4 },
    };
    expect(schema["ui:widget"]).toBe("textarea");
    expect(schema["ui:hidden"]).toBe(true);
    expect(schema["ui:options"]?.rows).toBe(4);
  });

  it("FormFooterConfig accepts show, okBtn, cancelBtn", () => {
    const config: import("@/components/JsonSchemaForm/types").FormFooterConfig =
      {
        show: true,
        okBtn: "Submit",
        cancelBtn: "Cancel",
      };
    expect(config.show).toBe(true);
    expect(config.okBtn).toBe("Submit");
  });

  it("JsonValue accepts nested objects and arrays", () => {
    const val: import("@/components/JsonSchemaForm/types").JsonValue = {
      nested: [1, "two", true, null],
    };
    expect(Array.isArray((val as Record<string, unknown>)["nested"])).toBe(
      true
    );
  });
});
