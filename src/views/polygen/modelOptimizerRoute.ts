import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from "vue-router";

export function buildModelOptimizerRoute(
  query: LocationQuery = {}
): RouteLocationRaw {
  const nextQuery: LocationQueryRaw = {};

  for (const [key, value] of Object.entries(query)) {
    nextQuery[key] = Array.isArray(value) ? [...value] : value;
  }

  return {
    path: "/plugins/3d-model-optimizer",
    query: nextQuery,
  };
}
