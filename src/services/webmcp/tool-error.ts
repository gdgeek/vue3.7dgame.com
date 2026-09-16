/** Return plain, redacted errors across the native structured-clone boundary. */
export function webMcpToolError(cause: unknown, readOnly: boolean) {
  const value = cause as {
    response?: { status?: number };
    name?: string;
    message?: string;
    code?: string;
  } | null;
  const httpStatus = value?.response?.status;
  const code =
    httpStatus === 401
      ? "authentication_required"
      : httpStatus === 403
        ? "permission_denied"
        : httpStatus === 404
          ? "not_found"
          : httpStatus === 409
            ? "write_conflict"
            : value?.name === "AbortError" ||
                /工作区已切换|会话.*切换|目标已改变|场景已切换|账号已切换/.test(
                  value?.message ?? ""
                )
              ? "session_closed"
              : cause instanceof TypeError || cause instanceof RangeError
                ? "invalid_input"
                : value?.message?.startsWith("publication_")
                  ? "publication_verification_failed"
                  : value?.code === "ECONNABORTED" ||
                      value?.code === "ERR_NETWORK"
                    ? "request_unconfirmed"
                    : "tool_failed";
  const messages: Record<string, string> = {
    authentication_required: "登录已失效，请重新登录后读取。",
    permission_denied: "当前账号没有执行此操作的权限。",
    not_found: "未找到可访问的目标，请重新读取当前页面。",
    write_conflict: "服务器拒绝冲突写入。本地修改保留，请先查看服务器版本。",
    session_closed: "页面或编辑器会话已关闭，请重新发现工具。",
    invalid_input: "工具参数不符合要求，请核对当前工具 schema。",
    publication_verification_failed:
      "发布正文未通过核验或读取范围已变化，不能用于导出或恢复。",
    request_unconfirmed: "请求超时或网络不可用，结果未确认。",
    tool_failed: "工具未正常完成，请读取页面状态与诊断后处理。",
  };
  return {
    isError: true,
    status: "failed",
    errorCode: code,
    message: messages[code],
    ...(Number.isInteger(httpStatus) ? { httpStatus } : {}),
    ...(readOnly ? {} : { persistence: "unverified" }),
    nextStep: readOnly
      ? "重新核对当前账号和页面，仅重试读取。"
      : "若已有 operationId，先查询原操作回执；不要自动重放写入。",
  };
}
