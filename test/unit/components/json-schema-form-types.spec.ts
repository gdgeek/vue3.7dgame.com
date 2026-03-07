/**
 * Unit tests for src/components/JsonSchemaForm/types.ts
 * Verifies that type-shape objects can be constructed at runtime.
 */
import { describe, it, expect } from "vitest";
import type {
  JsonSchemaUIOptions,
  JsonSchemaBase,
  JsonSchemaObject,
  JsonSchemaArray,
  JsonSchema,
  JsonValue,
  FormFooterConfig,
} from "@/components/JsonSchemaForm/types";

describe("JsonSchemaForm types", () => {
  describe("JsonSchemaUIOptions", () => {
    it("can be empty", () => {
      const opts: JsonSchemaUIOptions = {};
      expect(opts).toBeDefined();
    });

    it("supports placeholder, disabled, type, rows", () => {
      const opts: JsonSchemaUIOptions = {
        placeholder: "Enter value",
        disabled: false,
        type: "textarea",
        rows: 4,
      };
      expect(opts.placeholder).toBe("Enter value");
      expect(opts.rows).toBe(4);
    });

    it("supports additional keys via index signature", () => {
      const opts: JsonSchemaUIOptions = { custom: "value" };
      expect(opts["custom"]).toBe("value");
    });
  });

  describe("JsonSchemaBase", () => {
    it("can be an empty object", () => {
      const schema: JsonSchemaBase = {};
      expect(schema).toBeDefined();
    });

    it("supports all standard fields", () => {
      const schema: JsonSchemaBase = {
        type: "string",
        title: "My Field",
        description: "A description",
        default: "default-val",
        enum: ["a", "b", "c"],
        format: "email",
        readOnly: true,
        required: ["name"],
        minLength: 1,
        maxLength: 100,
        minimum: 0,
        maximum: 999,
      };
      expect(schema.type).toBe("string");
      expect(schema.enum).toHaveLength(3);
      expect(schema.minLength).toBe(1);
    });

    it("supports ui: extension fields", () => {
      const schema: JsonSchemaBase = {
        "ui:widget": "select",
        "ui:hidden": true,
        "ui:options": { disabled: true },
      };
      expect(schema["ui:widget"]).toBe("select");
      expect(schema["ui:hidden"]).toBe(true);
    });
  });

  describe("JsonSchemaObject", () => {
    it("requires type='object'", () => {
      const schema: JsonSchemaObject = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
      };
      expect(schema.type).toBe("object");
      expect(schema.properties?.name).toBeDefined();
    });
  });

  describe("JsonSchemaArray", () => {
    it("requires type='array' and supports items", () => {
      const schema: JsonSchemaArray = {
        type: "array",
        items: { type: "string" },
      };
      expect(schema.type).toBe("array");
      expect(schema.items).toBeDefined();
    });
  });

  describe("JsonSchema union", () => {
    it("can hold a base schema", () => {
      const s: JsonSchema = { type: "string", title: "Label" };
      expect(s.title).toBe("Label");
    });

    it("can hold an object schema", () => {
      const s: JsonSchema = { type: "object", properties: {} };
      expect(s.type).toBe("object");
    });

    it("can hold an array schema", () => {
      const s: JsonSchema = { type: "array", items: { type: "number" } };
      expect(s.type).toBe("array");
    });
  });

  describe("JsonValue", () => {
    it("can be a string", () => {
      const v: JsonValue = "hello";
      expect(v).toBe("hello");
    });

    it("can be a number", () => {
      const v: JsonValue = 42;
      expect(v).toBe(42);
    });

    it("can be null", () => {
      const v: JsonValue = null;
      expect(v).toBeNull();
    });

    it("can be a boolean", () => {
      const v: JsonValue = true;
      expect(v).toBe(true);
    });

    it("can be an array of JsonValues", () => {
      const v: JsonValue = [1, "two", null, true];
      expect(Array.isArray(v)).toBe(true);
    });

    it("can be a nested object", () => {
      const v: JsonValue = { key: "value", nested: { x: 1 } };
      expect((v as Record<string, JsonValue>)["key"]).toBe("value");
    });
  });

  describe("FormFooterConfig", () => {
    it("can be empty (all optional)", () => {
      const cfg: FormFooterConfig = {};
      expect(cfg).toBeDefined();
    });

    it("supports show, okBtn, cancelBtn", () => {
      const cfg: FormFooterConfig = {
        show: true,
        okBtn: "Save",
        cancelBtn: "Cancel",
      };
      expect(cfg.show).toBe(true);
      expect(cfg.okBtn).toBe("Save");
    });
  });
});
