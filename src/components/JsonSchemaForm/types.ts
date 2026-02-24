// JSON Schema type definitions
export type JsonSchemaType = string;

export type JsonSchemaFormat =
  | "date"
  | "date-time"
  | "time"
  | "email"
  | "uri"
  | "color"
  | string;

export interface JsonSchemaUIOptions {
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  rows?: number;
  [key: string]: unknown;
}

export interface JsonSchemaBase {
  type?: JsonSchemaType;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  format?: JsonSchemaFormat;
  readOnly?: boolean;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;

  // Validation
  required?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;

  // UI extensions
  "ui:widget"?: string;
  "ui:options"?: JsonSchemaUIOptions;
  "ui:hidden"?: boolean | string;
}

export interface JsonSchemaObject extends JsonSchemaBase {
  type: "object";
  properties?: Record<string, JsonSchema>;
  required?: string[];
}

export interface JsonSchemaArray extends JsonSchemaBase {
  type: "array";
  items?: JsonSchema;
}

export type JsonSchema = JsonSchemaBase | JsonSchemaObject | JsonSchemaArray;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface FormFooterConfig {
  show?: boolean;
  okBtn?: string;
  cancelBtn?: string;
}
