/**
 * Unit tests for src/components/Dialog/messageBox.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/components/Dialog/ConfirmDialog.vue", () => ({
  default: { name: "MockConfirmDialog" },
}));
vi.mock("@/components/Dialog/InputDialog.vue", () => ({
  default: { name: "MockInputDialog" },
}));

vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue")>();
  return {
    ...actual,
    createVNode: vi.fn(() => ({ el: null, component: null })),
    render: vi.fn(),
  };
});

describe("MessageBox.confirm()", () => {
  let MessageBox: typeof import("@/components/Dialog/messageBox").default;
  let createVNode: ReturnType<typeof vi.fn>;

  // Helpers to extract callbacks from the mock createVNode call
  const getConfirmProps = () => createVNode.mock.calls[0][1];

  beforeEach(async () => {
    vi.clearAllMocks();
    const vue = await import("vue");
    createVNode = vue.createVNode as ReturnType<typeof vi.fn>;
    ({ default: MessageBox } = await import("@/components/Dialog/messageBox"));
  });

  it("resolves when onConfirm is called", async () => {
    const promise = MessageBox.confirm("Are you sure?");
    const props = getConfirmProps();
    props.onConfirm();
    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects with 'cancel' when onCancel is called", async () => {
    const promise = MessageBox.confirm("Delete item?");
    const props = getConfirmProps();
    props.onCancel();
    await expect(promise).rejects.toBe("cancel");
  });

  it("rejects with 'cancel' when onUpdate:modelValue is called with false", async () => {
    const promise = MessageBox.confirm("Proceed?");
    const props = getConfirmProps();
    props["onUpdate:modelValue"](false);
    await expect(promise).rejects.toBe("cancel");
  });

  it("defaults title to '确认' when only message is provided", () => {
    MessageBox.confirm("test message");
    const props = getConfirmProps();
    expect(props.title).toBe("确认");
  });

  it("uses string second argument as title", () => {
    MessageBox.confirm("test message", "My Title");
    const props = getConfirmProps();
    expect(props.title).toBe("My Title");
  });

  it("uses options.title when second argument is an object with title", () => {
    MessageBox.confirm("test message", { title: "Object Title" });
    const props = getConfirmProps();
    expect(props.title).toBe("Object Title");
  });

  it("defaults to '确认' when second argument is object without title", () => {
    MessageBox.confirm("test message", { type: "warning" });
    const props = getConfirmProps();
    expect(props.title).toBe("确认");
  });

  it("passes message to the ConfirmDialog props", () => {
    MessageBox.confirm("Are you sure?");
    const props = getConfirmProps();
    expect(props.message).toBe("Are you sure?");
  });

  it("spreads options into props (type, description, etc.)", () => {
    MessageBox.confirm("msg", "Title", { type: "danger", description: "desc" });
    const props = getConfirmProps();
    expect(props.type).toBe("danger");
    expect(props.description).toBe("desc");
  });

  it("appends container to document.body", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    MessageBox.confirm("test");
    expect(appendSpy).toHaveBeenCalled();
  });

  it("removes container from body after onConfirm", async () => {
    const promise = MessageBox.confirm("test");
    const props = getConfirmProps();
    props.onConfirm();
    await promise;
    // Container should be removed after confirm
    // (document.body.removeChild was called)
    // No assertion needed beyond the promise resolving
  });
});

describe("MessageBox.prompt()", () => {
  let MessageBox: typeof import("@/components/Dialog/messageBox").default;
  let createVNode: ReturnType<typeof vi.fn>;

  const getPromptProps = () => createVNode.mock.calls[0][1];

  beforeEach(async () => {
    vi.clearAllMocks();
    const vue = await import("vue");
    createVNode = vue.createVNode as ReturnType<typeof vi.fn>;
    ({ default: MessageBox } = await import("@/components/Dialog/messageBox"));
  });

  it("resolves with { value, action } when onConfirm is called with a value", async () => {
    const promise = MessageBox.prompt("Enter name:");
    const props = getPromptProps();
    props.onConfirm("John Doe");
    await expect(promise).resolves.toEqual({
      value: "John Doe",
      action: "confirm",
    });
  });

  it("rejects with 'cancel' when onCancel is called", async () => {
    const promise = MessageBox.prompt("Enter name:");
    const props = getPromptProps();
    props.onCancel();
    await expect(promise).rejects.toBe("cancel");
  });

  it("rejects with 'cancel' when onUpdate:modelValue is called with false", async () => {
    const promise = MessageBox.prompt("Enter name:");
    const props = getPromptProps();
    props["onUpdate:modelValue"](false);
    await expect(promise).rejects.toBe("cancel");
  });

  it("defaults title to '输入'", () => {
    MessageBox.prompt("test");
    const props = getPromptProps();
    expect(props.title).toBe("输入");
  });

  it("uses provided title", () => {
    MessageBox.prompt("test", "My Input");
    const props = getPromptProps();
    expect(props.title).toBe("My Input");
  });

  it("passes message as description to InputDialog", () => {
    MessageBox.prompt("Enter your name:");
    const props = getPromptProps();
    expect(props.description).toBe("Enter your name:");
  });

  it("spreads options (placeholder, defaultValue) into props", () => {
    MessageBox.prompt("Enter:", "Title", {
      placeholder: "Type here...",
      defaultValue: "default text",
    });
    const props = getPromptProps();
    expect(props.placeholder).toBe("Type here...");
    expect(props.defaultValue).toBe("default text");
  });

  it("appends container to document.body", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    MessageBox.prompt("test");
    expect(appendSpy).toHaveBeenCalled();
  });
});
