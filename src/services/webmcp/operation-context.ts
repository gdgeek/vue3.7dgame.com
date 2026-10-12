import {
  createWriteOptions,
  type WriteOptions,
  type WriteReceipt,
  type WriteTarget,
} from "@/api/v1/write-contract";

export type OperationPhase =
  | "awaiting_confirmation"
  | "executing"
  | "submitting"
  | "completed"
  | "cancelled"
  | "failed"
  | "unknown"
  | "partial";
export type OperationContext = {
  operationId: string;
  target: WriteTarget;
  phase: (phase: OperationPhase) => void;
  acknowledge: (receipt: WriteReceipt) => void;
};
const signals = new WeakMap<AbortSignal, OperationContext>();
const previews = new WeakMap<object, OperationContext>();
export const bindOperationSignal = (
  signal: AbortSignal,
  operation: OperationContext
) => signals.set(signal, operation);
export const operationForSignal = (signal?: AbortSignal) =>
  signal ? signals.get(signal) : undefined;
export const bindOperationPreview = (
  preview: unknown,
  signal?: AbortSignal
) => {
  const operation = operationForSignal(signal);
  if (operation && typeof preview === "object" && preview !== null)
    previews.set(preview, operation);
};
/** Explicit proposal context; never infer a write owner from a global in-flight request. */
export const writeOptionsForPreview = (
  preview: object,
  fallbackRevision: unknown
): WriteOptions => {
  const operation = previews.get(preview);
  if (!operation) return createWriteOptions(fallbackRevision);
  return {
    operationId: operation.operationId,
    expectedRevision: operation.target.serverRevision,
    onSubmitting: () => operation.phase("submitting"),
    onAcknowledged: operation.acknowledge,
  };
};
