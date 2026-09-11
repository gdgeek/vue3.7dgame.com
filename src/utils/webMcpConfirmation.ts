const display = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return String(text ?? "").slice(0, 180);
};
/** Plain text only: block labels and field values are user-authored data. */
export function formatBlockOperationResults(
  results: Record<string, unknown>[]
) {
  const labels: Record<string, string> = {
    create: "新建",
    delete: "删除",
    set_fields: "修改字段",
    set_state: "修改状态",
    move: "移动",
    connect: "连接",
    disconnect: "断开连接",
  };
  return results.map((item, index) => {
    const target = [item.blockType, item.blockId].filter(Boolean).join(" / ");
    let detail = "";
    if (
      item.op === "set_fields" &&
      item.fields &&
      typeof item.fields === "object"
    ) {
      const before = item.previousFields as Record<string, unknown> | undefined;
      detail = Object.entries(item.fields)
        .map(
          ([key, value]) =>
            `${key}: ${before && key in before ? display(before[key]) + " → " : ""}${display(value)}`
        )
        .join("；");
    } else if (item.op === "connect") {
      detail = `→ ${display(item.parentBlockId)} ${display(item.connection)} ${display(item.inputName)}`;
    } else if (item.op === "move") detail = display(item.position);
    else if (item.op === "set_state")
      detail = `启用 ${display(item.enabled)}，折叠 ${display(item.collapsed)}，附加数据 ${display(item.data)}`;
    return `${index + 1}. ${labels[String(item.op)] ?? display(item.op)} ${target}${detail ? ": " + detail : ""}`;
  });
}

export function formatScriptWarnings(warnings: unknown): string[] {
  if (!Array.isArray(warnings) || warnings.length === 0) return [];
  return [
    `校验警告 ${warnings.length} 项（保存允许保留警告，运行前需要检查）：`,
    ...warnings.slice(0, 20).map((warning) => {
      if (!warning || typeof warning !== "object")
        return `- ${display(warning)}`;
      const value = warning as Record<string, unknown>;
      return `- ${display(value.code)} ${display(value.blockId)}：${display(value.message)}`;
    }),
    ...(warnings.length > 20 ? ["其余警告请查看完整预览结果。"] : []),
  ];
}

export function hasGeneratedScriptErrors(warnings: unknown): boolean {
  return (
    Array.isArray(warnings) &&
    warnings.some((warning) => {
      if (!warning || typeof warning !== "object") return false;
      const code = (warning as Record<string, unknown>).code;
      return (
        code === "invalid-generated-lua" ||
        code === "invalid-generated-javascript"
      );
    })
  );
}
