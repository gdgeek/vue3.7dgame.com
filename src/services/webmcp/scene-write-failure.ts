import { isAxiosError } from "axios";
import { WebMcpCompletionError } from "./completion-result";

/** Preserve local edits while distinguishing a rejected write from a lost reply. */
export function sceneWriteFailure(
  error: unknown,
  context: Record<string, unknown>,
  message: string
) {
  const conflict = isAxiosError(error) && error.response?.status === 409;
  return new WebMcpCompletionError(
    {
      ...context,
      status: "partial",
      editorApplied: true,
      persistence: conflict ? "server_rejected" : "unverified",
      retry: conflict
        ? "review_server_state_before_retry"
        : "read_state_before_retry",
      ...(conflict ? { errorCode: "write_conflict", httpStatus: 409 } : {}),
    },
    conflict
      ? `${message}，服务器拒绝了冲突写入；本地修改仍未保存，请先核对最新版本，再重新预览`
      : `${message}，保存结果未确认，请先读取状态再操作`
  );
}
