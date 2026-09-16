import { shallowRef } from "vue";
import type { WriteTarget } from "@/api/v1/write-contract";
type Target = Pick<WriteTarget, "targetType" | "targetId">;
type Scope = Target & { actorId: string; page: string };
export type ConflictCopy = Target & {
  action: string;
  operationId: string;
  expectedRevision: string;
  localJson: string;
};
let scope: Scope | null = null;
let epoch = 0;
export const conflictCopy = shallowRef<ConflictCopy | null>(null);
export function setConflictScope(next: Scope | null) {
  if (JSON.stringify(next) === JSON.stringify(scope)) return;
  scope = next;
  epoch++;
  conflictCopy.value = null;
}
export function captureConflictScope(target: Target) {
  return scope &&
    scope.targetType === target.targetType &&
    scope.targetId === target.targetId
    ? epoch
    : null;
}
export function recordConflict(owner: number | null, copy: ConflictCopy) {
  if (owner !== null && owner === epoch && scope) conflictCopy.value = copy;
}
export function clearConflict(owner: number | null, operationId: string) {
  if (
    owner !== null &&
    owner === epoch &&
    conflictCopy.value?.operationId === operationId
  )
    conflictCopy.value = null;
}
