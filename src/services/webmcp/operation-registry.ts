import type { WebMcpTool } from "./model-context";
import { bindOperationSignal, type OperationPhase } from "./operation-context";
import {
  validOperationId,
  validRevision,
  type WriteReceipt,
  type WriteTarget,
} from "@/api/v1/write-contract";

type Scope = WriteTarget & { actorId: string };
export type OperationRegistration = {
  getScope: () => Scope | null;
  registerStatusTools?: boolean;
  readReceipt?: (
    scope: WriteTarget,
    operationId: string
  ) => Promise<WriteReceipt>;
};
type Entry = {
  operationId: string;
  toolName: string;
  scope: Scope;
  status: OperationPhase;
  updatedAt: number;
  receipt?: WriteReceipt;
  result?: unknown;
  controller?: AbortController;
};
const entries = new Map<string, Entry>();
const STORAGE_KEY = "xrugc-webmcp-operations-v1";
const RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 100;
const key = (scope: Scope, operationId: string) =>
  `${scope.actorId}:${scope.targetType}:${scope.targetId}:${operationId}`;
const sameScope = (a: Scope, b: Scope | null) =>
  !!b &&
  a.actorId === b.actorId &&
  a.targetType === b.targetType &&
  a.targetId === b.targetId;
const persist = () => {
  try {
    const rows = [...entries.values()]
      .filter((e) => e.updatedAt > Date.now() - RETENTION_MS)
      .slice(-MAX_ENTRIES);
    // No proposal bodies, result/error text, tokens or resource URLs in browser storage.
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        rows.map(
          ({ operationId, toolName, scope, status, updatedAt, receipt }) => ({
            operationId,
            toolName,
            scope,
            status,
            updatedAt,
            receipt,
          })
        )
      )
    );
  } catch {
    /* Server receipts remain authoritative when browser storage is unavailable. */
  }
};
const restore = () => {
  try {
    const rows: Entry[] = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || "[]"
    );
    for (const row of rows.slice(-MAX_ENTRIES)) {
      if (
        !row?.scope ||
        typeof row.scope.actorId !== "string" ||
        !validOperationId(row.operationId) ||
        !validRevision(row.scope.serverRevision) ||
        row.updatedAt <= Date.now() - RETENTION_MS
      )
        continue;
      const id = key(row.scope, row.operationId);
      if (!entries.has(id))
        entries.set(id, { ...row, status: "unknown", receipt: undefined });
    }
  } catch {
    /* Ignore corrupt metadata. */
  }
};
const publicState = (entry: Entry) => ({
  operationId: entry.operationId,
  toolName: entry.toolName,
  targetType: entry.scope.targetType,
  targetId: entry.scope.targetId,
  status: entry.status,
  ...(entry.receipt ? { writeReceipt: entry.receipt } : {}),
  ...(entry.result === undefined ? {} : { result: entry.result }),
  nextAction:
    entry.status === "partial" &&
    (entry.result as { persistence?: string })?.persistence ===
      "server_rejected"
      ? "review_server_state_before_retry"
      : ["completed", "cancelled", "failed"].includes(entry.status)
        ? "inspect_result"
        : "query_operation_before_retry",
});

export function withOperationReceipts(
  tools: WebMcpTool[],
  options: OperationRegistration,
  lifecycle: AbortSignal
): WebMcpTool[] {
  restore();
  const staged = new Map<string, Scope>();
  const requireScope = () => {
    const scope = options.getScope();
    if (!scope || !scope.actorId || !validRevision(scope.serverRevision))
      throw new Error("编辑器缺少服务器版本或登录信息，请重新加载后再操作");
    return { ...scope };
  };
  const wrapped = tools.map((tool) => {
    if (tool.name.startsWith("xrugc_stage_"))
      return {
        ...tool,
        async execute(input: unknown, execution?: { signal: AbortSignal }) {
          const scope = requireScope();
          const result = (await tool.execute(input, execution)) as Record<
            string,
            unknown
          >;
          if (
            typeof result?.draftId === "string" &&
            sameScope(scope, options.getScope())
          ) {
            if (staged.size >= MAX_ENTRIES)
              staged.delete(staged.keys().next().value!);
            staged.set(result.draftId, scope);
          }
          return result;
        },
      };
    if (!tool.name.startsWith("xrugc_complete_")) return tool;
    return {
      ...tool,
      description: `${tool.description} 此调用快速返回 operationId 和当前状态；页面确认仍需完成。之后调用 xrugc_get_operation_status 查询最终结果，不能把等待状态当作成功，也不要重复提交。`,
      execute(input: unknown, execution?: { signal: AbortSignal }) {
        const scope = requireScope();
        const draftId = (input as { draftId?: unknown })?.draftId;
        if (!validOperationId(draftId))
          throw new Error("draftId 必须是有效 UUID");
        const id = key(scope, draftId);
        const existing = entries.get(id);
        if (existing) {
          if (existing.toolName !== tool.name)
            throw new Error("操作 ID 已用于不同工具");
          return publicState(existing);
        }
        const target = staged.get(draftId);
        if (!target || !sameScope(target, scope))
          return { status: "expired_or_missing", draftId };
        for (const entry of entries.values()) {
          if (
            sameScope(entry.scope, scope) &&
            entry.controller &&
            !["completed", "cancelled", "failed", "partial"].includes(
              entry.status
            )
          )
            return {
              status: "busy",
              operationId: entry.operationId,
              nextAction: "query_operation_before_retry",
            };
        }
        while (entries.size >= MAX_ENTRIES) {
          const expired = [...entries].find(([, e]) => !e.controller);
          if (!expired) throw new Error("待处理操作过多，请先查询现有操作");
          entries.delete(expired[0]);
        }
        staged.delete(draftId);
        const controller = new AbortController();
        const entry: Entry = {
          operationId: draftId,
          toolName: tool.name,
          scope: target,
          status: "awaiting_confirmation",
          updatedAt: Date.now(),
          controller,
        };
        entries.set(id, entry);
        const update = (phase: OperationPhase) => {
          entry.status = phase;
          entry.updatedAt = Date.now();
          persist();
        };
        bindOperationSignal(controller.signal, {
          operationId: draftId,
          target,
          phase: (phase) => {
            if (!sameScope(target, options.getScope()))
              throw new Error("对象或账号已经切换，未提交写入");
            if (
              phase === "executing" &&
              target.serverRevision !== options.getScope()?.serverRevision
            )
              throw new Error("确认期间服务器内容版本已变化，请重新预览");
            update(phase);
          },
          acknowledge: (receipt) => {
            entry.receipt = receipt;
            persist();
          },
        });
        // A replaced tool loses its individual registration signal before the
        // rest of its page owner is disposed. Revoke that pending confirmation
        // too, while retaining the existing receipt semantics after submission.
        const signals = new Set([lifecycle]);
        if (execution?.signal) signals.add(execution.signal);
        const abortListeners = [...signals].map((signal) => {
          const abort = () => controller.abort(signal.reason);
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
          return { signal, abort };
        });
        persist();
        void Promise.resolve()
          .then(() => tool.execute(input, { signal: controller.signal }))
          .then(
            (result) => {
              entry.result = result;
              const status = (result as { status?: string })?.status;
              update(
                status === "completed"
                  ? "completed"
                  : status === "partial"
                    ? "partial"
                    : status === "cancelled" ||
                        status === "expired_or_missing" ||
                        status?.endsWith("_changed")
                      ? "cancelled"
                      : "failed"
              );
            },
            () => {
              // An exception after submission is not proof the server rejected the write.
              update(
                entry.receipt
                  ? "partial"
                  : entry.status === "submitting" ||
                      entry.status === "executing"
                    ? "unknown"
                    : controller.signal.aborted
                      ? "cancelled"
                      : "failed"
              );
            }
          )
          .finally(() => {
            for (const { signal, abort } of abortListeners)
              signal.removeEventListener("abort", abort);
            entry.controller = undefined;
          });
        return publicState(entry);
      },
    };
  });
  if (options.registerStatusTools === false) return wrapped;
  const schema = {
    type: "object",
    properties: { operationId: { type: "string", format: "uuid" } },
    required: ["operationId"],
    additionalProperties: false,
  };
  const parse = (input: unknown) => {
    const operationId = (input as { operationId?: unknown })?.operationId;
    if (!validOperationId(operationId))
      throw new Error("operationId 必须是有效 UUID");
    const scope = requireScope();
    return { scope, operationId, entry: entries.get(key(scope, operationId)) };
  };
  wrapped.push(
    {
      name: "xrugc_get_operation_status",
      title: "读取 WebMCP 操作回执",
      description:
        "查询当前实体/场景的操作状态。等待确认不等于成功；服务器回执可在重载后查询。not_observed 或 unknown 不证明写入失败，不要据此重试。",
      inputSchema: schema,
      annotations: { readOnlyHint: true },
      async execute(input) {
        const { scope, operationId, entry } = parse(input);
        if (
          entry?.controller &&
          ["awaiting_confirmation", "executing"].includes(entry.status)
        )
          return publicState(entry);
        try {
          const receipt = options.readReceipt
            ? await options.readReceipt(scope, operationId)
            : (
                await (
                  await import("@/api/v1/write-protocol")
                ).getWriteReceipt(scope.targetType, scope.targetId, operationId)
              ).data;
          if (!sameScope(scope, options.getScope()))
            throw new Error("当前对象或账号已经切换");
          if (
            receipt.operationId !== operationId ||
            receipt.targetId !== scope.targetId ||
            receipt.targetType !== scope.targetType ||
            receipt.status !== "completed"
          )
            throw new Error("服务器回执不匹配");
          return {
            ...(entry ? publicState(entry) : {}),
            operationId,
            status: entry?.status === "partial" ? "partial" : "completed",
            writeReceipt: receipt,
            verification: "server_acknowledged",
            nextAction: "inspect_result",
          };
        } catch (error) {
          if (!sameScope(scope, options.getScope()))
            throw new Error("当前对象或账号已经切换");
          const status = (error as { response?: { status?: number } }).response
            ?.status;
          if (status === 401 || status === 403) throw error;
          if (
            entry &&
            ["cancelled", "failed", "completed", "partial"].includes(
              entry.status
            )
          )
            return publicState(entry);
          return {
            ...(entry ? publicState(entry) : {}),
            operationId,
            status: entry?.controller ? entry.status : "unknown",
            serverStatus: status === 404 ? "not_observed" : "unavailable",
            nextAction: "query_operation_before_retry",
          };
        }
      },
    },
    {
      name: "xrugc_cancel_operation",
      title: "取消尚未确认的 WebMCP 操作",
      description:
        "只取消仍在等待页面确认的操作；已经执行或提交的操作不能撤回，应查询回执。",
      inputSchema: schema,
      annotations: { readOnlyHint: false },
      execute(input) {
        const { operationId, entry } = parse(input);
        if (!entry?.controller || entry.status !== "awaiting_confirmation")
          return {
            operationId,
            status: "not_cancellable",
            nextAction: "query_operation_before_retry",
          };
        entry.controller.abort(new DOMException("操作已取消", "AbortError"));
        entry.status = "cancelled";
        persist();
        return publicState(entry);
      },
    }
  );
  return wrapped;
}
