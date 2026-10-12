import type { WebMcpTool } from "./model-context";

export type WebMcpToolDescription = Omit<WebMcpTool, "execute">;
export type WebMcpToolSnapshot = {
  contextToken: string;
  tools: WebMcpToolDescription[];
};

type Registration = {
  owner: AbortController;
  controller: AbortController;
  tool: WebMcpTool;
};

const expired = () =>
  new DOMException(
    "工具所属的页面或编辑会话已变化，请重新查询当前工具。",
    "AbortError"
  );

// Registration also runs with the compatibility feature disabled, including on
// ordinary HTTP pages where randomUUID is unavailable but getRandomValues works.
const newContextToken = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/** One registry per document, independent of native WebMCP availability. */
export class WebMcpToolRegistry {
  private readonly entries = new Map<string, Registration>();
  private readonly owners = new Set<AbortController>();
  private readonly listeners = new Set<() => void>();
  private contextToken = newContextToken();

  snapshot(): WebMcpToolSnapshot {
    return {
      contextToken: this.contextToken,
      tools: [...this.entries.values()].map(({ tool }) => ({
        name: tool.name,
        ...(tool.title ? { title: tool.title } : {}),
        description: tool.description,
        inputSchema: JSON.parse(JSON.stringify(tool.inputSchema)),
        ...(tool.annotations ? { annotations: { ...tool.annotations } } : {}),
      })),
    };
  }

  lookup(name: string): WebMcpTool | undefined {
    return this.entries.get(name)?.tool;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(): void {
    this.contextToken = newContextToken();
    for (const listener of this.listeners) listener();
  }

  register(
    tools: WebMcpTool[],
    owner: AbortController
  ): { tool: WebMcpTool; signal: AbortSignal }[] {
    owner.signal.throwIfAborted();
    this.owners.add(owner);
    const owned: Registration[] = [];
    const unregister = () => {
      this.owners.delete(owner);
      let changed = false;
      for (const entry of owned) {
        if (this.entries.get(entry.tool.name) === entry) {
          this.entries.delete(entry.tool.name);
          changed = true;
        }
        entry.controller.abort(owner.signal.reason);
      }
      if (changed) this.changed();
    };
    owner.signal.addEventListener("abort", unregister, { once: true });

    for (const source of tools) {
      const previous = this.entries.get(source.name);
      previous?.controller.abort(expired());
      const controller = new AbortController();
      const assertCurrent = () => {
        owner.signal.throwIfAborted();
        controller.signal.throwIfAborted();
        if (this.entries.get(source.name) !== entry) throw expired();
      };
      const entry: Registration = {
        owner,
        controller,
        tool: {
          ...source,
          async execute(input) {
            assertCurrent();
            const result = await source.execute(input, {
              signal: controller.signal,
            });
            // Old read results are unsafe to present as the current scene. A write
            // acknowledgment, however, must survive disposal racing its delivery.
            if (source.annotations?.readOnlyHint) assertCurrent();
            return result;
          },
        },
      };
      owned.push(entry);
      this.entries.set(source.name, entry);
    }
    if (owned.length) this.changed();
    return owned.map(({ tool, controller }) => ({
      tool,
      signal: controller.signal,
    }));
  }

  /** Revoke all callbacks and pending confirmations after identity changes. */
  invalidate(): void {
    const owners = [...this.owners];
    this.entries.clear();
    for (const owner of owners) owner.abort(expired());
    this.changed();
  }
}

const registries = new WeakMap<Document, WebMcpToolRegistry>();

export function getWebMcpToolRegistry(
  targetDocument: Document | undefined = typeof document === "undefined"
    ? undefined
    : document
): WebMcpToolRegistry | null {
  if (!targetDocument) return null;
  let registry = registries.get(targetDocument);
  if (!registry) {
    registry = new WebMcpToolRegistry();
    registries.set(targetDocument, registry);
  }
  return registry;
}
