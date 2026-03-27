import type { Ref } from "vue";

export interface UseIframeMessagingOptions {
  onError?: () => void;
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function useIframeMessaging(
  editorRef: Ref<HTMLIFrameElement | null | undefined>,
  options?: UseIframeMessagingOptions
) {
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
      editorRef.value.contentWindow.postMessage(
        {
          type,
          id,
          payload:
            payload !== undefined
              ? JSON.parse(JSON.stringify(payload))
              : undefined,
        },
        "*"
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
    return postStandardMessage("REQUEST", { action, ...data });
  };

  return {
    postStandardMessage,
    sendRequest,
    pendingRequests,
  };
}
