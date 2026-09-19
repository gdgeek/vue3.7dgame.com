import { webMcpToolError } from "./tool-error";
import {
  withOperationReceipts,
  type OperationRegistration,
} from "./operation-registry";
import { getWebMcpToolRegistry } from "./tool-registry";
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
 * Tools remain available to optional transports without native browser support.
 * Aborting the returned controller unregisters this call's tools.
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
  const registry = getWebMcpToolRegistry(targetDocument);
  if (!registry) return null;

  const lifecycle = new AbortController();

  const businessTools = options.operations
    ? withOperationReceipts(tools, options.operations, lifecycle.signal)
    : tools;
  const registeredTools = registry.register(
    businessTools.map((tool) => ({
      ...tool,
      async execute(input: unknown, execution?: { signal: AbortSignal }) {
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
        return tool.execute(input, {
          signal: execution?.signal ?? lifecycle.signal,
        });
      },
    })),
    lifecycle
  );
  if (!modelContext?.registerTool) return lifecycle;

  for (const { tool, signal } of registeredTools) {
    try {
      void Promise.resolve(
        modelContext.registerTool(
          {
            ...tool,
            async execute(input) {
              try {
                return await tool.execute(input);
              } catch (error) {
                return webMcpToolError(
                  error,
                  tool.annotations?.readOnlyHint === true
                );
              }
            },
          },
          { signal }
        )
      ).catch((error) => options.onRegistrationError?.(tool.name, error));
    } catch (error) {
      options.onRegistrationError?.(tool.name, error);
    }
  }

  return lifecycle;
};

/** Shared inventory remains usable without a native browser API. */
export const getRegisteredWebMcpTools = (target: Document = document) =>
  (getWebMcpToolRegistry(target)?.snapshot().tools ?? []).map(
    ({ name, title, annotations }) => ({ name, title, annotations })
  );

export const invokeRegisteredWebMcpTool = async (
  name: string,
  input: unknown,
  target: Document = document
) => {
  const tool = getWebMcpToolRegistry(target)?.lookup(name);
  if (!tool) throw new Error("当前页面工具不可用");
  try {
    return await tool.execute(input);
  } catch (error) {
    return webMcpToolError(error, tool.annotations?.readOnlyHint === true);
  }
};

export const getRegisteredWebMcpSchema = (
  name: string,
  target: Document = document
) => {
  const tool = getWebMcpToolRegistry(target)?.lookup(name);
  if (!tool) return null;
  return structuredClone({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
  });
};
