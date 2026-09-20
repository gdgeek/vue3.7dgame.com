import type { Ref } from "vue";

export interface UseIframeMessagingOptions {
  onError?: () => void;
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function useIframeMessaging(
  editorRef: Ref<HTMLIFrameElement | null | undefined>,
  options?: UseIframeMessagingOptions
) {
  let hostSessionId = genId();
  const getHostSessionId = () => hostSessionId;

  const pendingRequests = new Map<
    string,
    (payload: Record<string, unknown>) => void
  >();

  const postStandardMessage = (
    type: string,
    payload?: unknown
  ): string | undefined => {
    if (editorRef.value && editorRef.value.contentWindow) {
      const id = genId();
      if (type === "INIT" || type === "DESTROY") hostSessionId = genId();
      const record =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : {};
      if (type === "INIT") {
        payload = {
          ...record,
          config: { ...((record.config as object) ?? {}), hostSessionId },
        };
      } else if (type === "REQUEST") payload = { ...record, hostSessionId };
      let origin: string;
      try {
        origin = new URL(editorRef.value.src, window.location.href).origin;
      } catch {
        options?.onError?.();
        return undefined;
      }
      editorRef.value.contentWindow.postMessage(
        {
          type,
          id,
          payload:
            payload !== undefined
              ? JSON.parse(JSON.stringify(payload))
              : undefined,
        },
        origin
      );
      return id;
    } else {
      options?.onError?.();
      return undefined;
    }
  };

  const sendRequest = (
    action: string,
    data?: Record<string, unknown>
  ): string | undefined => {
    return postStandardMessage("REQUEST", { ...data, action });
  };

  return {
    postStandardMessage,
    sendRequest,
    pendingRequests,
    getHostSessionId,
  };
}
