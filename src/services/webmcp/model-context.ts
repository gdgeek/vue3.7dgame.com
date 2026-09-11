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
              lifecycle.signal.throwIfAborted();
              const result = await tool.execute(input, {
                signal: lifecycle.signal,
              });
              // Preserve a known commit acknowledgment even if disposal races its delivery.
              return result;
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
