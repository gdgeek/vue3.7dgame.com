/** A known editor mutation must survive a later persistence/acknowledgment failure. */
export class WebMcpCompletionError extends Error {
  readonly result: Record<string, unknown>;

  constructor(
    result: Record<string, unknown>,
    message = "编辑器已应用修改，但持久化结果尚未核实；请先读取当前状态"
  ) {
    super(message);
    this.name = "WebMcpCompletionError";
    this.result = result;
  }
}

export function completionFailure(
  error: unknown,
  draftId: string
): Record<string, unknown> {
  if (!(error instanceof WebMcpCompletionError)) throw error;
  return { ...error.result, draftId, message: error.message };
}
