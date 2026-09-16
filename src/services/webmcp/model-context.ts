import { webMcpToolError } from "./tool-error";
import {
  withOperationReceipts,
  type OperationRegistration,
} from "./operation-registry";
export type WebMcpToolAnnotations = {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
};

export type WebMcpTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: WebMcpToolAnnotations;
  execute: (
    input: unknown,
    execution?: { signal: AbortSignal }
  ) => unknown | Promise<unknown>;
};

type WebMcpModelContext = {
  registerTool: (
    tool: WebMcpTool,
    options?: { signal?: AbortSignal }
  ) => void | Promise<void>;
};

type WebMcpDocument = Document & {
  readonly modelContext?: WebMcpModelContext;
};

export type WebMcpRegistrationOptions = {
  document?: Document;
  operations?: OperationRegistration;
  getEditorLoadingState?: () => {
    ready: boolean;
    loading: boolean;
    blocked: boolean;
    status: "loading" | "ready" | "error";
    error: string | null;
    retryAfterMs: number | null;
  };
  onRegistrationError?: (toolName: string, error: unknown) => void;
};

/**
 * Register a page-scoped set of WebMCP tools.
 *
 * Unsupported browsers are intentionally a no-op. Aborting the returned
 * controller unregisters every tool registered by this call.
 */
export const registerWebMcpTools = (
  tools: WebMcpTool[],
  options: WebMcpRegistrationOptions = {}
): AbortController | null => {
  const targetDocument = (options.document ??
    (typeof document === "undefined" ? undefined : document)) as
    | WebMcpDocument
    | undefined;
  const modelContext = targetDocument?.modelContext;

  if (!modelContext?.registerTool) return null;

  const lifecycle = new AbortController();

  const registeredTools = options.operations
    ? withOperationReceipts(tools, options.operations, lifecycle.signal)
    : tools;
  for (const tool of registeredTools) {
    try {
      void Promise.resolve(
        modelContext.registerTool(
          {
            ...tool,
            async execute(input) {
              try {
                lifecycle.signal.throwIfAborted();
                const loading = options.getEditorLoadingState?.();
                if (
                  loading?.blocked &&
                  ![
                    "xrugc_get_scene_editor_context",
                    "xrugc_get_editor_context",
                    "xrugc_get_workflow_guide",
                    "xrugc_get_operation_status",
                    "xrugc_cancel_operation",
                    "xrugc_list_scene_publications",
                    "xrugc_get_scene_publication_version",
                    "xrugc_compare_scene_publications",
                    "xrugc_export_scene_publication",
                  ].includes(tool.name)
                ) {
                  return {
                    ...loading,
                    applied: false,
                    nextStep:
                      "请先读取工作区上下文，等待 ready=true 后再操作；status=error 时请用户重新载入。",
                  };
                }
                const result = await tool.execute(input, {
                  signal: lifecycle.signal,
                });
                // Preserve a known commit acknowledgment even if disposal races its delivery.
                return result;
              } catch (error) {
                return webMcpToolError(
                  error,
                  tool.annotations?.readOnlyHint === true
                );
              }
            },
          },
          { signal: lifecycle.signal }
        )
      ).catch((error) => options.onRegistrationError?.(tool.name, error));
    } catch (error) {
      options.onRegistrationError?.(tool.name, error);
    }
  }

  return lifecycle;
};
