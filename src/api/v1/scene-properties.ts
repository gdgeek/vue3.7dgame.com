import request from "@/utils/request";
import qs from "querystringify";
import {
  createVerseQueryParams,
  type VersesParams,
  type VerseData,
} from "./verse";

export interface SceneProperty {
  id: number;
  key: string;
  info: unknown;
}

export type AddScenePropertyData =
  | { key: string; info?: string | null; propertyId?: never }
  | { propertyId: number; key?: never; info?: never };

export const getGlobalScenePropertyOptions = () =>
  request<SceneProperty[]>({
    url: "/v1/verses/global-property-options",
    method: "get",
    skipErrorMessage: true,
  });

export const getScenesByProperty = (propertyId: number, params: VersesParams) =>
  request<VerseData[]>({
    url: `/v1/verses/by-property${qs.stringify({ ...createVerseQueryParams(params), propertyId }, true)}`,
    method: "get",
  });

export const getSceneByProperty = (
  sceneId: number,
  propertyId: number,
  expand = "image,author,tags,metas"
) => {
  const fields = new Set(
    expand
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean)
  );
  fields.add("public");
  return request<VerseData>({
    url: `/v1/verses/by-property/${sceneId}${qs.stringify({ propertyId, expand: [...fields].join(","), cl: "lua" }, true)}`,
    method: "get",
  });
};

export const getScenePropertyOptions = (sceneId: number) =>
  request<SceneProperty[]>({
    url: `/v1/verses/${sceneId}/property-options`,
    method: "get",
    skipErrorMessage: true,
  });

export const getSceneProperties = (sceneId: number) =>
  request<SceneProperty[]>({
    url: `/v1/verses/${sceneId}/properties`,
    method: "get",
    skipErrorMessage: true,
  });

export const addSceneProperty = (sceneId: number, data: AddScenePropertyData) =>
  request<{ success: boolean; property: SceneProperty }>({
    url: `/v1/verses/${sceneId}/properties`,
    method: "post",
    data,
    skipErrorMessage: true,
  });

export const removeSceneProperty = (sceneId: number, propertyId: number) =>
  request<{ success: boolean; property: SceneProperty }>({
    url: `/v1/verses/${sceneId}/properties/${propertyId}`,
    method: "delete",
    skipErrorMessage: true,
  });

export const getScenePropertyUsage = (sceneId: number, propertyId: number) =>
  request<{ property: SceneProperty; sceneCount: number }>({
    url: `/v1/verses/${sceneId}/properties/${propertyId}/usage`,
    method: "get",
    skipErrorMessage: true,
  });

export const deleteGlobalSceneProperty = (
  sceneId: number,
  propertyId: number
) =>
  request<{
    success: boolean;
    property: SceneProperty;
    affectedSceneCount: number;
  }>({
    url: `/v1/verses/${sceneId}/properties/${propertyId}/global`,
    method: "delete",
    skipErrorMessage: true,
  });
