import type { MetaInfo } from "@/api/v1/types/meta";

export type MetaSceneInsertLoader = (id: number) => Promise<MetaInfo>;

export class MetaSceneInsertError extends Error {
  constructor(message = "Entity details are incomplete") {
    super(message);
    this.name = "MetaSceneInsertError";
  }
}

export const isCompleteMetaForSceneInsert = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const meta = value as Partial<MetaInfo>;
  return (
    typeof meta.id === "number" &&
    Number.isFinite(meta.id) &&
    Object.prototype.hasOwnProperty.call(meta, "data") &&
    meta.data !== undefined &&
    Array.isArray(meta.resources) &&
    Object.prototype.hasOwnProperty.call(meta, "events") &&
    meta.events !== undefined
  );
};

export const resolveCompleteMetasForSceneInsert = async (
  items: MetaInfo[],
  load: MetaSceneInsertLoader
): Promise<MetaInfo[]> => {
  const resolved = await Promise.all(
    items.map(async (item) => {
      if (isCompleteMetaForSceneInsert(item)) return item;
      const detail = await load(item.id);
      if (!isCompleteMetaForSceneInsert(detail)) {
        throw new MetaSceneInsertError();
      }
      return detail as MetaInfo;
    })
  );

  return resolved;
};

export const insertCompleteMetasForScene = async (
  items: MetaInfo[],
  load: MetaSceneInsertLoader,
  insert: (meta: MetaInfo) => void
): Promise<MetaInfo[]> => {
  const completeMetas = await resolveCompleteMetasForSceneInsert(items, load);
  completeMetas.forEach(insert);
  return completeMetas;
};
