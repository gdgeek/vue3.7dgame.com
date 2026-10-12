/** Correlates iframe work with the exact frame and host session that requested it. */
export function createIframeRpc(options: {
  frame: () => HTMLIFrameElement | null | undefined;
  session: () => string | null | undefined;
  ready?: () => boolean;
  send: (action: string, data: Record<string, unknown>) => string | undefined;
}) {
  const pending = new Map<
    string,
    {
      resolve: (data: Record<string, unknown>) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
      frame: Window;
      session: string | null | undefined;
    }
  >();
  const cancel = (reason = "编辑器会话已结束") => {
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error(reason));
    }
    pending.clear();
  };
  const request = (
    action: string,
    data: Record<string, unknown> = {},
    timeoutMs = 15000
  ) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const frame = options.frame()?.contentWindow;
      if (!frame || options.ready?.() === false)
        return reject(new Error("编辑器尚未准备完成"));
      const session = options.session();
      const requestId = options.send(action, data);
      if (!requestId) return reject(new Error("编辑器请求未发送"));
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`编辑器请求超时：${action}`));
      }, timeoutMs);
      pending.set(requestId, { resolve, reject, timer, frame, session });
    });
  const handleMessage = (event: MessageEvent) => {
    const frame = options.frame();
    if (!frame || event.source !== frame.contentWindow) return false;
    let origin: string;
    try {
      origin = new URL(frame.src, window.location.href).origin;
    } catch {
      return false;
    }
    if (event.origin !== origin) return false;
    const message = event.data;
    if (
      !message ||
      message.type !== "RESPONSE" ||
      typeof message.requestId !== "string"
    )
      return false;
    const item = pending.get(message.requestId);
    if (
      !item ||
      item.frame !== event.source ||
      item.session !== options.session()
    )
      return false;
    const payload = message.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return false;
    if (item.session && payload.hostSessionId !== item.session) return false;
    pending.delete(message.requestId);
    clearTimeout(item.timer);
    item.resolve(payload);
    return true;
  };
  return { request, handleMessage, cancel };
}
