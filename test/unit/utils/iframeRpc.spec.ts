import { afterEach, describe, expect, it, vi } from "vitest";
import { createIframeRpc } from "@/utils/iframeRpc";

const frames: HTMLIFrameElement[] = [];
afterEach(() => {
  frames.splice(0).forEach((frame) => frame.remove());
  vi.useRealTimers();
});
function setup() {
  const frame = document.createElement("iframe");
  frame.src = "https://editor.example.test/app";
  document.body.append(frame);
  frames.push(frame);
  let session = "session-one";
  let serial = 0;
  const rpc = createIframeRpc({
    frame: () => frame,
    session: () => session,
    send: () => String(++serial),
  });
  const response = (
    id: string,
    payload: object,
    source: MessageEventSource | null = frame.contentWindow,
    origin = "https://editor.example.test"
  ) => {
    const event = new MessageEvent("message", {
      data: { type: "RESPONSE", requestId: id, payload },
      origin,
    });
    Object.defineProperty(event, "source", { value: source });
    return rpc.handleMessage(event);
  };
  return {
    rpc,
    response,
    setSession: (value: string) => {
      session = value;
    },
  };
}
describe("iframe RPC boundaries", () => {
  it("correlates concurrently completed requests without mixing results", async () => {
    const { rpc, response } = setup();
    const first = rpc.request("first");
    const second = rpc.request("second");
    response("2", { hostSessionId: "session-one", value: "second" });
    response("1", { hostSessionId: "session-one", value: "first" });
    expect((await first).value).toBe("first");
    expect((await second).value).toBe("second");
  });
  it("rejects wrong origin, frame and session before resolving", async () => {
    const { rpc, response } = setup();
    const result = rpc.request("read");
    expect(response("1", { hostSessionId: "session-one" }, window)).toBe(false);
    expect(
      response(
        "1",
        { hostSessionId: "session-one" },
        undefined,
        "https://wrong.test"
      )
    ).toBe(false);
    expect(response("1", { hostSessionId: "stale" })).toBe(false);
    expect(response("1", { hostSessionId: "session-one", ok: true })).toBe(
      true
    );
    expect((await result).ok).toBe(true);
  });
  it("cancels pending work on page/session replacement and rejects late responses", async () => {
    const { rpc, response, setSession } = setup();
    const result = rpc.request("write");
    const rejected = expect(result).rejects.toThrow("会话");
    setSession("session-two");
    expect(response("1", { hostSessionId: "session-one" })).toBe(false);
    rpc.cancel();
    await rejected;
    expect(response("1", { hostSessionId: "session-two" })).toBe(false);
  });
  it("removes timed out requests", async () => {
    vi.useFakeTimers();
    const { rpc, response } = setup();
    const result = rpc.request("slow", {}, 100);
    const rejected = expect(result).rejects.toThrow("超时");
    await vi.advanceTimersByTimeAsync(100);
    await rejected;
    expect(response("1", { hostSessionId: "session-one" })).toBe(false);
  });
});
