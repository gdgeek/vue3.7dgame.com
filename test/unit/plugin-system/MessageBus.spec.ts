import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { MessageBus } from "@/plugin-system/core/MessageBus";

import type { PluginMessage } from "@/plugin-system/types";
import type { MessageHandler } from "@/plugin-system/core/MessageBus";

/** Helper to create a minimal PluginMessage */
function createMessage(overrides: Partial<PluginMessage> = {}): PluginMessage {
  return {
    type: "EVENT",
    id: "msg-1",
    ...overrides,
  };
}

/** Helper to create a mock iframe with a postMessage spy */
function createMockIframe(origin: string): HTMLIFrameElement {
  const postMessageSpy = vi.fn();
  const frameWindow = { postMessage: postMessageSpy };
  return {
    contentWindow: frameWindow,
  } as unknown as HTMLIFrameElement;
}

function dispatchPluginMessage(
  iframe: HTMLIFrameElement,
  origin: string,
  message: PluginMessage = createMessage()
) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: message,
      origin,
      source: iframe.contentWindow as MessageEventSource,
    })
  );
}

describe("MessageBus", () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  afterEach(() => {
    bus.destroy();
  });

  describe("registerPlugin / unregisterPlugin", () => {
    it("should register a plugin connection", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const msg = createMessage();
      bus.sendToPlugin("pluginA", msg);

      expect(iframe.contentWindow?.postMessage).toHaveBeenCalledWith(
        msg,
        "https://a.example.com"
      );
    });

    it("should not throw when unregistering a non-existent plugin", () => {
      expect(() => bus.unregisterPlugin("missing")).not.toThrow();
    });

    it("should stop sending after unregister", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");
      bus.unregisterPlugin("pluginA");

      bus.sendToPlugin("pluginA", createMessage());
      expect(iframe.contentWindow?.postMessage).not.toHaveBeenCalled();
    });
  });

  describe("sendToPlugin", () => {
    it("should log warning when plugin not found", () => {
      // Should not throw, just warn
      expect(() => bus.sendToPlugin("unknown", createMessage())).not.toThrow();
    });

    it("should send message to the correct iframe", () => {
      const iframeA = createMockIframe("https://a.example.com");
      const iframeB = createMockIframe("https://b.example.com");
      bus.registerPlugin("a", iframeA, "https://a.example.com");
      bus.registerPlugin("b", iframeB, "https://b.example.com");

      const msg = createMessage({ id: "only-for-a" });
      bus.sendToPlugin("a", msg);

      expect(iframeA.contentWindow?.postMessage).toHaveBeenCalledWith(
        msg,
        "https://a.example.com"
      );
      expect(iframeB.contentWindow?.postMessage).not.toHaveBeenCalled();
    });
  });

  describe("broadcast", () => {
    it("should send message to all registered plugins", () => {
      const iframeA = createMockIframe("https://a.example.com");
      const iframeB = createMockIframe("https://b.example.com");
      bus.registerPlugin("a", iframeA, "https://a.example.com");
      bus.registerPlugin("b", iframeB, "https://b.example.com");

      const msg = createMessage({ type: "TOKEN_UPDATE" });
      bus.broadcast(msg);

      expect(iframeA.contentWindow?.postMessage).toHaveBeenCalledWith(
        msg,
        "https://a.example.com"
      );
      expect(iframeB.contentWindow?.postMessage).toHaveBeenCalledWith(
        msg,
        "https://b.example.com"
      );
    });

    it("should do nothing when no plugins registered", () => {
      expect(() => bus.broadcast(createMessage())).not.toThrow();
    });
  });

  describe("onMessage", () => {
    it("should invoke handler when a message arrives from a registered origin", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const handler = vi.fn();
      bus.onMessage(handler);

      const msg = createMessage({ type: "PLUGIN_READY" });
      dispatchPluginMessage(iframe, "https://a.example.com", msg);

      expect(handler).toHaveBeenCalledWith("pluginA", msg);
    });

    it("should return an unsubscribe function", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const handler = vi.fn();
      const unsub = bus.onMessage(handler);
      unsub();

      dispatchPluginMessage(iframe, "https://a.example.com");

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("onMessageType", () => {
    it("should invoke handler only for matching message type", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const readyHandler = vi.fn();
      const eventHandler = vi.fn();
      bus.onMessageType("PLUGIN_READY", readyHandler);
      bus.onMessageType("EVENT", eventHandler);

      dispatchPluginMessage(
        iframe,
        "https://a.example.com",
        createMessage({ type: "PLUGIN_READY", id: "r1" })
      );

      expect(readyHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it("should return an unsubscribe function", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const handler = vi.fn();
      const unsub = bus.onMessageType("EVENT", handler);
      unsub();

      dispatchPluginMessage(iframe, "https://a.example.com", createMessage({ type: "EVENT" }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("origin verification", () => {
    it("should discard messages from unregistered origins", () => {
      const handler = vi.fn();
      bus.onMessage(handler);

      window.dispatchEvent(
        new MessageEvent("message", {
          data: createMessage(),
          origin: "https://evil.example.com",
        })
      );

      expect(handler).not.toHaveBeenCalled();
    });

    it("should only accept messages from the exact registered origin", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const handler = vi.fn();
      bus.onMessage(handler);

      // Wrong origin - should be discarded
      window.dispatchEvent(
        new MessageEvent("message", {
          data: createMessage(),
          origin: "https://a.example.com.evil.com",
        })
      );

      expect(handler).not.toHaveBeenCalled();
    });

    it("should route same-origin messages by event source", () => {
      const iframeA = createMockIframe("https://shared.example.com");
      const iframeB = createMockIframe("https://shared.example.com");
      bus.registerPlugin("pluginA", iframeA, "https://shared.example.com");
      bus.registerPlugin("pluginB", iframeB, "https://shared.example.com");

      const handler = vi.fn();
      bus.onMessage(handler);

      const msg = createMessage({ id: "from-b" });
      dispatchPluginMessage(iframeB, "https://shared.example.com", msg);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith("pluginB", msg);
    });

    it("should discard messages when origin matches but source does not", () => {
      const iframe = createMockIframe("https://a.example.com");
      const unknownIframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const handler = vi.fn();
      bus.onMessage(handler);

      dispatchPluginMessage(unknownIframe, "https://a.example.com");

      expect(handler).not.toHaveBeenCalled();
    });

    it("should discard messages when source matches but origin does not", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const handler = vi.fn();
      bus.onMessage(handler);

      dispatchPluginMessage(iframe, "https://evil.example.com");

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("should stop receiving messages after destroy", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const handler = vi.fn();
      bus.onMessage(handler);

      bus.destroy();

      window.dispatchEvent(
        new MessageEvent("message", {
          data: createMessage(),
          origin: "https://a.example.com",
        })
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("error isolation in handlers", () => {
    it("should not break dispatch when a handler throws", () => {
      const iframe = createMockIframe("https://a.example.com");
      bus.registerPlugin("pluginA", iframe, "https://a.example.com");

      const badHandler: MessageHandler = () => {
        throw new Error("handler error");
      };
      const goodHandler = vi.fn();

      bus.onMessage(badHandler);
      bus.onMessage(goodHandler);

      dispatchPluginMessage(iframe, "https://a.example.com");

      expect(goodHandler).toHaveBeenCalledTimes(1);
    });
  });
});
