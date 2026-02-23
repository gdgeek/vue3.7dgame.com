import request from "@/utils/request";
import qs from "querystringify";
import { v4 as uuidv4 } from "uuid";
import environment from "@/environment";
import type {
  VerseData,
  VerseCode,
  PostVerseData,
  PutVerseData,
} from "./types/verse";
import type { JsonValue } from "./types/common";
import { ResourceInfo } from "@/api/v1/resources/model";

export type meta = {
  id: number;
  data: JsonValue;
  uuid: string;
  events: string;
  title: string;
  prefabs: number;
  type: string;
  script: string;
};

export type VerseMetasWithJsCode = {
  id: number;
  metas: meta[];
  name: string;
  description: string;
  uuid: string;
  data: string;
  code: string;
  resources: ResourceInfo[];
};

export const postVerse = (data: PostVerseData) => {
  data.version = environment.version;
  data.uuid = data.uuid || uuidv4();
  return request({
    url: `/v1/verses`,
    method: "post",
    data,
  });
};

export const putVerseCode = (id: number, data: VerseCode) => {
  return request<VerseCode>({
    url: `/v1/verses/${id}/code`,
    data,
    method: "put",
  });
};
export const getVerse = (id: number, expand = "metas,share", cl = "lua") => {
  return request<VerseData>({
    url: `/v1/verses/${id}${qs.stringify({ expand: expand, cl }, true)}`,
    method: "get",
  });
};
/*
export const getVerseMetasWithJsCode = (
  id: number,
  expand = "id,name,description,data,metas,resources,code,uuid,code",
  cl = "js"
) => {
  return request({
    url: `/v1/system/verse${qs.stringify(
      { verse_id: id, expand: expand, cl },
      true
    )}`,
    method: "get",
  });
};*/
export interface VersesParams {
  sort?: string;
  search?: string;
  page?: number;
  expand?: string;
  tags?: number[]; // 假设tags是数字ID数组，如果是其他类型可以相应调整
}

const createQueryParams = ({
  sort,
  search,
  page,
  expand,
  tags,
}: VersesParams): Record<string, unknown> => {
  const query: Record<string, unknown> = {};
  query["expand"] = expand;
  query["sort"] = sort;
  if (search && search !== "") {
    query["VerseSearch[name]"] = search;
  }

  if (page && page > 1) {
    query["page"] = page;
  }
  if (tags && tags.length > 0) {
    query["tags"] = tags;
  }
  return query;
};

export const getPublic = (params: VersesParams) => {
  const query = createQueryParams(params);

  //expand = "id,name,description,data,metas,resources,code,uuid,code",
  return request<VerseData[]>({
    url: `/v1/verses/public${qs.stringify(query, true)}`,
    method: "get",
  });
};
export const getVerses = (params: VersesParams) => {
  const query = createQueryParams(params);
  return request<VerseData[]>({
    url: `/v1/verses${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const putVerse = (id: number, data: PutVerseData) => {
  data.version = environment.version;
  return request({
    url: `/v1/verses/${id}`,
    method: "put",
    data,
  });
};

export const deleteVerse = (id: number | string) => {
  return request({
    url: `/v1/verses/${id}`,
    method: "delete",
  });
};

/**
 * 将 verse 设为公开
 * POST /v1/verse/{id}/public
 */
export const addPublic = (id: number | string) => {
  return request({
    url: `/v1/verses/${id}/public`,
    method: "post",
  });
};

/**
 * 取消 verse 公开状态
 * DELETE /v1/verse/{id}/public
 */
export const removePublic = (id: number | string) => {
  return request({
    url: `/v1/verses/${id}/public`,
    method: "delete",
  });
};

/**
 * 为 verse 添加标签
 * POST /v1/verses/{id}/tag?tags_id={tags_id}
 */
export const addTag = (id: number | string, tagsId: number | string) => {
  return request({
    url: `/v1/verses/${id}/tag${qs.stringify({ tags_id: tagsId }, true)}`,
    method: "post",
  });
};

/**
 * 移除 verse 的标签
 * DELETE /v1/verses/{id}/tag?tags_id={tags_id}
 */
export const removeTag = (id: number | string, tagsId: number | string) => {
  return request({
    url: `/v1/verses/${id}/tag${qs.stringify({ tags_id: tagsId }, true)}`,
    method: "delete",
  });
};

/**
 * 为 verse 拍照生成快照
 * POST /v1/verses/{id}/take-photo
 */
export const takePhoto = (verseId: number) => {
  return request({
    url: `/v1/verses/${verseId}/take-photo`,
    method: "post",
  });
};
