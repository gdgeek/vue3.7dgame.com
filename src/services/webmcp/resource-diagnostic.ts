/** Only explicit, bounded resource facts may cross the tool error boundary. */
export type ResourceField = "id" | "type" | "fileId" | "md5" | "resourcePin";
type ResourceCode =
  | "resource_version_incomplete"
  | "resource_response_mismatch"
  | "resource_version_changed"
  | "resource_unavailable"
  | "resource_pin_missing";
type ResourceTarget = { id: number; type: string; fileId?: number };
const guidance: Record<ResourceCode, { message: string; nextStep: string }> = {
  resource_version_incomplete: {
    message: "素材文件或版本信息不完整，不能生成可核验备份。",
    nextStep:
      "先用 xrugc_get_asset_metadata 核对素材。选择已有完整文件版本的素材，或请素材管理方修复文件关联与校验信息，再重新导出；不要编造 MD5 或修改备份绕过校验。",
  },
  resource_response_mismatch: {
    message: "素材响应与请求的 ID 或类型不匹配。",
    nextStep:
      "重新核对素材 ID、类型和当前账号，再读取素材；不要采用不匹配的响应。",
  },
  resource_version_changed: {
    message: "素材版本已改变，不能按原依赖恢复。",
    nextStep:
      "找回备份对应的原素材版本；若明确接受当前素材，请重新导出并预览恢复，不要修改备份哈希绕过校验。",
  },
  resource_unavailable: {
    message: "无法读取素材，尚不能判断它是否已删除。",
    nextStep:
      "核对登录、访问权限和网络后重试读取；不要把读取失败当成已删除，不要自动替换素材。",
  },
  resource_pin_missing: {
    message: "备份缺少所引用素材的版本记录。",
    nextStep:
      "从有权访问的原对象重新导出完整工程，再预览恢复；不要补造素材版本。",
  },
};
export class ResourceDiagnosticError extends Error {
  readonly details: {
    resource: ResourceTarget;
    fields: ResourceField[];
    referencedBy?: { kind: "entity" | "scene"; id: number };
  };
  constructor(
    readonly errorCode: ResourceCode,
    resource: ResourceTarget,
    fields: ResourceField[] = [],
    readonly httpStatus?: number
  ) {
    super(guidance[errorCode].message);
    this.details = {
      resource: {
        id: resource.id,
        type: resource.type.slice(0, 80),
        ...(Number.isSafeInteger(resource.fileId) && resource.fileId! > 0
          ? { fileId: resource.fileId }
          : {}),
      },
      fields: [...fields],
    };
  }
  result() {
    return {
      isError: true,
      status: "failed",
      errorCode: this.errorCode,
      ...guidance[this.errorCode],
      details: structuredClone(this.details),
      ...(Number.isInteger(this.httpStatus) &&
      this.httpStatus! >= 400 &&
      this.httpStatus! <= 599
        ? { httpStatus: this.httpStatus }
        : {}),
    };
  }
}
export function resourceReadError(cause: unknown, type: string, id: number) {
  if (cause instanceof ResourceDiagnosticError) return cause;
  const status = (cause as { response?: { status?: number } } | null)?.response
    ?.status;
  return new ResourceDiagnosticError(
    "resource_unavailable",
    { type, id },
    [],
    status
  );
}
export function validateResourcePin(
  pin: { id?: unknown; type?: unknown; fileId?: unknown; md5?: unknown },
  requested: ResourceTarget
): void {
  const mismatched: ResourceField[] = [];
  if (pin.id !== requested.id) mismatched.push("id");
  if (pin.type !== requested.type) mismatched.push("type");
  if (mismatched.length)
    throw new ResourceDiagnosticError(
      "resource_response_mismatch",
      requested,
      mismatched
    );
  const fields: ResourceField[] = [];
  if (!Number.isSafeInteger(pin.fileId) || Number(pin.fileId) <= 0)
    fields.push("fileId");
  if (typeof pin.md5 !== "string" || !pin.md5.trim()) fields.push("md5");
  if (fields.length)
    throw new ResourceDiagnosticError(
      "resource_version_incomplete",
      {
        ...requested,
        fileId: typeof pin.fileId === "number" ? pin.fileId : undefined,
      },
      fields
    );
}
