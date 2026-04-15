import type { LocationQueryRaw } from "vue-router";

export type PluginHostAction =
  | {
      type: "navigate-host";
      path: string;
      query: LocationQueryRaw;
    }
  | {
      type: "reload-host";
    }
  | null;

function toQueryRecord(value: unknown): LocationQueryRaw {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const query: LocationQueryRaw = {};

  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (Array.isArray(item)) {
      query[key] = item.map((entry) => String(entry));
      return;
    }
    if (item == null) {
      query[key] = item;
      return;
    }
    query[key] = String(item);
  });

  return query;
}

export function resolvePluginHostAction(
  payload: Record<string, unknown>
): PluginHostAction {
  const event = typeof payload.event === "string" ? payload.event : "";

  if (event === "plugin-registry-changed") {
    return { type: "reload-host" };
  }

  if (event !== "navigate-host") {
    return null;
  }

  const path = typeof payload.path === "string" ? payload.path : "";
  if (!path) {
    return null;
  }

  return {
    type: "navigate-host",
    path,
    query: toQueryRecord(payload.query),
  };
}
