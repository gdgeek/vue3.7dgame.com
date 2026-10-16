import request from "@/utils/request";

export interface SceneProperty {
  id: number;
  key: string;
  info: unknown;
}

export interface AddScenePropertyData {
  key: string;
  info?: string | null;
}

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
