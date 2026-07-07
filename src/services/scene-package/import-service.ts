// 场景导入服务（简化版）
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

import { postVerseImportZip } from "@/api/v1/scene-package";
import { putMeta } from "@/api/v1/meta";
import {
  getVerse,
  putVerse,
  type VerseData,
} from "@/api/v1/verse";
import {
  putAudio,
  putParticle,
  putPicture,
  putPolygen,
  putVideo,
  putVoxel,
} from "@/api/v1/resources";
import type { JsonValue } from "@/api/v1/types/common";
import type { MetaInfo } from "@/api/v1/types/meta";
import type { ResourceInfo } from "@/api/v1/resources/model";

export interface ImportResult {
  success: boolean;
  verseId: number;
  error?: string;
}

type VerseWithResources = VerseData & {
  resources?: ResourceInfo[];
};

const stripImportCopySuffix = (value: unknown): string => {
  const text = String(value || "").trim();
  const cleaned = text.replace(/\s*[（(]\s*副本[^）)]*[）)]\s*$/u, "").trim();
  return cleaned || text;
};

const cleanNameFields = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((item) => cleanNameFields(item as JsonValue)) as JsonValue;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const next: Record<string, JsonValue> = {};
  Object.entries(value as Record<string, JsonValue>).forEach(([key, item]) => {
    if ((key === "name" || key === "title") && typeof item === "string") {
      next[key] = stripImportCopySuffix(item);
      return;
    }
    next[key] = cleanNameFields(item);
  });

  return next as JsonValue;
};

const updateResourceName = async (resource: ResourceInfo) => {
  const name = stripImportCopySuffix(resource.name);
  if (!resource.id || !name || name === resource.name) return;

  const payload = { name };
  switch (resource.type) {
    case "audio":
      await putAudio(resource.id, payload);
      break;
    case "particle":
      await putParticle(resource.id, payload);
      break;
    case "picture":
      await putPicture(resource.id, payload);
      break;
    case "polygen":
      await putPolygen(resource.id, payload);
      break;
    case "video":
      await putVideo(resource.id, payload);
      break;
    case "voxel":
      await putVoxel(resource.id, payload);
      break;
    default:
      break;
  }
};

const cleanupImportedSceneNames = async (verseId: number) => {
  const response = await getVerse(
    verseId,
    "metas.resources,resources,image,author,verseTags"
  );
  const verse = response.data as VerseWithResources;
  const cleanVerseName = stripImportCopySuffix(verse.name);
  const cleanVerseData = cleanNameFields(verse.data);
  const verseUpdate: { name?: string; data?: JsonValue } = {};

  if (cleanVerseName && cleanVerseName !== verse.name) {
    verseUpdate.name = cleanVerseName;
  }
  if (JSON.stringify(cleanVerseData) !== JSON.stringify(verse.data)) {
    verseUpdate.data = cleanVerseData;
  }
  if (Object.keys(verseUpdate).length > 0) {
    await putVerse(verseId, verseUpdate);
  }

  const resources = new Map<number, ResourceInfo>();
  verse.resources?.forEach((resource) => resources.set(resource.id, resource));

  await Promise.all(
    (verse.metas || []).map(async (meta: MetaInfo) => {
      const cleanTitle = stripImportCopySuffix(meta.title);
      const cleanData = meta.data === null ? null : cleanNameFields(meta.data);
      const metaUpdate: {
        title?: string;
        data?: JsonValue | null;
      } = {};

      if (cleanTitle && cleanTitle !== meta.title) {
        metaUpdate.title = cleanTitle;
      }
      if (JSON.stringify(cleanData) !== JSON.stringify(meta.data)) {
        metaUpdate.data = cleanData;
      }
      meta.resources?.forEach((resource) => resources.set(resource.id, resource));

      if (Object.keys(metaUpdate).length > 0) {
        await putMeta(meta.id, metaUpdate);
      }
    })
  );

  await Promise.all([...resources.values()].map(updateResourceName));
};

/**
 * 导入场景包 ZIP 文件。
 */
export async function importScene(file: File): Promise<ImportResult> {
  try {
    const response = await postVerseImportZip(file);
    await cleanupImportedSceneNames(response.data.verseId).catch((error) => {
      console.warn("Failed to cleanup imported scene names", error);
    });

    return {
      success: true,
      verseId: response.data.verseId,
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "导入失败，请重试";
    return {
      success: false,
      verseId: 0,
      error: errorMessage,
    };
  }
}
