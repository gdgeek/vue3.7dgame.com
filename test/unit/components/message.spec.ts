/**
 * Unit tests for src/components/Dialog/message.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Vue component and rendering
vi.mock("@/components/Dialog/Message.vue", () => ({ default: { name: "MockMessage" } }));

const mockClose = vi.fn();
const mockEl = document.createElement("div");
Object.defineProperty(mockEl, "offsetHeight", { value: 48, configurable: true });
const mockVnode = {
  el: mockEl,
  component: { exposed: { close: mockClose } },
  appContext: null,
};

vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue")>();
  return {
    ...actual,
    createVNode: vi.fn(() => mockVnode),
    render: vi.fn(),
  };
});

describe("Message()", () => {
  let Message: typeof import("@/components/Dialog/message").default;
  let createVNode: ReturnType<typeof vi.fn>;
  let vueRender: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClose.mockReset();
    const vue = await import("vue");
    createVNode = vue.createVNode as ReturnType<typeof vi.fn>;
    vueRender = vue.render as ReturnType<typeof vi.fn>;
    createVNode.mockReturnValue(mockVnode);
    ({ default: Message } = await import("@/components/Dialog/message"));
  });

  it("accepts a string argument and creates message with that text", () => {
    Message("Hello World");
    const props = createVNode.mock.calls[0][1];
    expect(props.message).toBe("Hello World");
  });

  it("accepts an options object", () => {
    Message({ message: "test", type: "error" });
    const props = createVNode.mock.calls[0][1];
    expect(props.message).toBe("test");
    expect(props.type).toBe("error");
  });

  it("returns an object with a close function", () => {
    const result = Message("test");
    expect(typeof result.close).toBe("function");
  });

  it("generates unique incrementing ids", () => {
    Message("msg1");
    Message("msg2");
    const id1: string = createVNode.mock.calls[0][1].id;
    const id2: string = createVNode.mock.calls[1][1].id;
    expect(id1).toMatch(/^message_\d+$/);
    expect(id2).toMatch(/^message_\d+$/);
    expect(id1).not.toBe(id2);
  });

  it("calls render to mount the message component", () => {
    Message("test");
    expect(vueRender).toHaveBeenCalled();
  });

  it("appends the element to document.body", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    Message("test");
    expect(appendSpy).toHaveBeenCalledWith(mockVnode.el);
  });

  it("close() calls userOnClose callback", () => {
    const onClose = vi.fn();
    const { close } = Message({ message: "test", onClose });
    close();
    expect(onClose).toHaveBeenCalled();
  });

  it("close() calls component's exposed.close()", () => {
    const { close } = Message("test");
    close();
    expect(mockClose).toHaveBeenCalled();
  });

  it("props.onClose callback triggers internal close (calls component exposed.close)", () => {
    Message("onclose-test");
    const props = createVNode.mock.calls[0][1];
    // Trigger the onClose prop (simulating the component emitting close)
    props.onClose();
    expect(mockClose).toHaveBeenCalled();
  });

  it("props.onDestroy callback calls render with null to clean up container", () => {
    Message("ondestroy-test");
    const props = createVNode.mock.calls[0][1];
    const callsBefore = vueRender.mock.calls.length;
    props.onDestroy();
    expect(vueRender.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCall = vueRender.mock.calls[vueRender.mock.calls.length - 1];
    expect(lastCall[0]).toBeNull();
  });
});

describe("Message static methods", () => {
  let Message: typeof import("@/components/Dialog/message").default;
  let createVNode: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const vue = await import("vue");
    createVNode = vue.createVNode as ReturnType<typeof vi.fn>;
    createVNode.mockReturnValue(mockVnode);
    ({ default: Message } = await import("@/components/Dialog/message"));
  });

  it("Message.success() sets type to 'success'", () => {
    Message.success("ok");
    expect(createVNode.mock.calls[0][1].type).toBe("success");
  });

  it("Message.warning() sets type to 'warning'", () => {
    Message.warning("warn");
    expect(createVNode.mock.calls[0][1].type).toBe("warning");
  });

  it("Message.info() sets type to 'info'", () => {
    Message.info("info");
    expect(createVNode.mock.calls[0][1].type).toBe("info");
  });

  it("Message.error() sets type to 'error'", () => {
    Message.error("err");
    expect(createVNode.mock.calls[0][1].type).toBe("error");
  });

  it("Message.success() preserves message text", () => {
    Message.success("Great success");
    expect(createVNode.mock.calls[0][1].message).toBe("Great success");
  });

  it("Message.error() accepts options object", () => {
    Message.error({ message: "bad", duration: 3000 });
    const props = createVNode.mock.calls[0][1];
    expect(props.message).toBe("bad");
    expect(props.type).toBe("error");
    expect(props.duration).toBe(3000);
  });

  it("Message.success() accepts options object", () => {
    Message.success({ message: "done", duration: 2000 });
    const props = createVNode.mock.calls[0][1];
    expect(props.message).toBe("done");
    expect(props.type).toBe("success");
    expect(props.duration).toBe(2000);
  });

  it("Message.warning() accepts options object", () => {
    Message.warning({ message: "caution", duration: 4000 });
    const props = createVNode.mock.calls[0][1];
    expect(props.message).toBe("caution");
    expect(props.type).toBe("warning");
  });

  it("Message.info() accepts options object", () => {
    Message.info({ message: "note", duration: 1000 });
    const props = createVNode.mock.calls[0][1];
    expect(props.message).toBe("note");
    expect(props.type).toBe("info");
  });
});
