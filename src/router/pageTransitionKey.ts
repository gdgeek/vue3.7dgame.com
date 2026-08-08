import type { RouteLocationNormalizedLoaded } from "vue-router";

function stableEntries(
  record: Readonly<Record<string, unknown>> | undefined,
  excludedKeys: ReadonlySet<string> = new Set()
) {
  return Object.keys(record ?? {})
    .filter((key) => !excludedKeys.has(key))
    .sort()
    .map((key) => {
      const value = record?.[key];
      return [key, Array.isArray(value) ? [...value] : (value ?? null)];
    });
}

export function getPageTransitionKey(
  route: RouteLocationNormalizedLoaded
): string {
  const excludedQueryKeys = route.meta?.preserveComponentOnQueryChange
    ? new Set(Object.keys(route.query))
    : new Set(route.meta?.preserveComponentOnQueryKeys ?? []);

  return JSON.stringify([
    route.path,
    stableEntries(route.params),
    route.hash ?? "",
    stableEntries(route.query, excludedQueryKeys),
  ]);
}
