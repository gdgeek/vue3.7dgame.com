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

type RegisteredDescriptor = Pick<WebMcpTool, "name" | "title" | "annotations">;
const inventories = new WeakMap<
  Document,
  Map<
    string,
    {
      owner: AbortController;
      order: number;
      tool: WebMcpTool;
      descriptor: RegisteredDescriptor;
    }
  >
>();

let registrationOrder = 0;

/** Only tools whose registration succeeded and whose lifetime is still active. */
export const getRegisteredWebMcpTools = (target: Document = document) =>
  [...(inventories.get(target)?.values() ?? [])].map(({ descriptor }) => ({
    ...descriptor,
    annotations: { ...descriptor.annotations },
  }));

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
  const inventory = inventories.get(targetDocument!) ?? new Map();
  inventories.set(targetDocument!, inventory);
  lifecycle.signal.addEventListener(
    "abort",
    () => {
      for (const [name, entry] of inventory) {
        if (entry.owner === lifecycle) inventory.delete(name);
      }
    },
    { once: true }
  );

  const registeredTools = options.operations
    ? withOperationReceipts(tools, options.operations, lifecycle.signal)
    : tools;
  for (const tool of registeredTools) {
    const order = ++registrationOrder;
    let registeredTool: WebMcpTool;
    try {
      void Promise.resolve(
        modelContext.registerTool(
          (registeredTool = {
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
          }),
          { signal: lifecycle.signal }
        )
      )
        .then(() => {
          if (
            lifecycle.signal.aborted ||
            (inventory.get(tool.name)?.order ?? 0) > order
          )
            return;
          inventory.set(tool.name, {
            owner: lifecycle,
            order,
            tool: registeredTool,
            descriptor: {
              name: tool.name,
              title: tool.title,
              annotations: tool.annotations,
            },
          });
        })
        .catch((error) => options.onRegistrationError?.(tool.name, error));
    } catch (error) {
      options.onRegistrationError?.(tool.name, error);
    }
  }

  return lifecycle;
};

/** Internal orchestration uses exactly the registered wrapper and its lifecycle/receipt guards. */
export const invokeRegisteredWebMcpTool = async (
  name: string,
  input: unknown,
  target: Document = document
) => {
  const entry = inventories.get(target)?.get(name);
  if (!entry || entry.owner.signal.aborted)
    throw new Error("当前页面工具不可用");
  return entry.tool.execute(input);
};
export const getRegisteredWebMcpSchema = (
  name: string,
  target: Document = document
) => {
  const entry = inventories.get(target)?.get(name);
  if (!entry || entry.owner.signal.aborted) return null;
  return structuredClone({
    name: entry.tool.name,
    description: entry.tool.description,
    inputSchema: entry.tool.inputSchema,
    annotations: entry.tool.annotations,
  });
};
