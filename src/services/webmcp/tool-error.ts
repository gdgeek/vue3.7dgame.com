import { ResourceDiagnosticError } from "./resource-diagnostic";

/** Return plain, redacted errors across the native structured-clone boundary. */
export function webMcpToolError(cause: unknown, readOnly: boolean) {
  if (cause instanceof ResourceDiagnosticError) {
    return {
      ...cause.result(),
      ...(readOnly
        ? {}
        : {
            persistence: "unverified",
            nextStep: `若已有 operationId，先查询原操作回执；不要自动重放写入。${cause.result().nextStep}`,
          }),
    };
  }
  const value = cause as {
    response?: { status?: number; data?: { message?: unknown } };
    name?: string;
    message?: string;
    code?: string;
  } | null;
  const editorMessages: Record<string, string> = {
    ANIMATION_PREVIEW_ACTIVE:
      "动画预览仍在进行；先用 stop 停止预览，再重新预览编辑或保存操作。",
    CAPABILITY_UNAVAILABLE:
      "当前编辑器未提供该协议，请更新编辑器后重新发现工具。",
    UNSUPPORTED_NODE_TYPE:
      "目标节点类型不支持该属性，先读取节点类型和字段约束。",
    INVALID_REQUEST: "编辑器拒绝参数，请核对工具 schema 和字段约束。",
    INVALID_RANGE: "字段超出支持范围，请读取当前节点或动画约束。",
    ENTITY_CONFLICT: "实体版本已经变化，请重新读取并预览。",
    VERSION_CONFLICT: "实体版本已经变化，请重新读取并预览。",
    NODE_PROPERTIES_CONFLICT: "节点属性已经变化，请重新读取并预览。",
    ANIMATION_CONFLICT: "导入动画版本已经变化，请重新查询 metadata。",
    ANIMATION_NOT_READY: "尚未获得实际导入动画，请等待载入并重新读取。",
    NO_ACTIVE_PREVIEW: "此动画尚未开始预览，无法暂停或恢复。",
    NODE_NOT_FOUND: "当前编辑器找不到该节点，请读取节点树。",
    READ_ONLY: "当前实体没有编辑权限。",
    EDITOR_LOADING: "编辑器仍在加载，请等待 ready 后重试读取。",
  };
  if (value?.code && editorMessages[value.code])
    return {
      isError: true,
      status: "failed",
      errorCode: value.code.toLowerCase(),
      message: editorMessages[value.code],
      ...(readOnly ? {} : { persistence: "unverified" }),
      nextStep: "先读取当前能力、节点状态与原操作回执；不要自动重放写入。",
    };
  const httpStatus = value?.response?.status;
  const code =
    httpStatus === 410 &&
    value?.response?.data?.message === "publication_version_expired"
      ? "publication_version_expired"
      : httpStatus === 401
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
    publication_version_expired:
      "该发布版本的正文已按保留策略清理，无法再读取、比较或导出；原发布成功回执仍有效。",
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
    nextStep:
      code === "publication_version_expired"
        ? "调用 xrugc_list_scene_publications 查看仍保留的版本；不要重试读取该过期版本，也不要自动重新发布。"
        : readOnly
          ? "重新核对当前账号和页面，仅重试读取。"
          : "若已有 operationId，先查询原操作回执；不要自动重放写入。",
  };
}
