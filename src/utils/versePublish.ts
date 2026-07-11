type SceneData = {
  children?: {
    modules?: unknown[];
  };
};

const parseSceneData = (value: unknown): unknown => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

/**
 * A scene is publishable only when its root modules collection contains an
 * entity. Accepts either editor scene data or an API verse containing `data`.
 */
export const hasPublishableSceneContent = (value: unknown): boolean => {
  const parsed = parseSceneData(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return false;
  }

  const modules = (parsed as SceneData).children?.modules;
  if (Array.isArray(modules)) {
    return modules.length > 0;
  }

  if ("data" in parsed) {
    return hasPublishableSceneContent((parsed as { data?: unknown }).data);
  }

  return false;
};
