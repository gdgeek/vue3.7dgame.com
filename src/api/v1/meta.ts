import request from "@/utils/request";
import qs from "querystringify";
import { ResourceInfo } from "@/api/v1/resources/model";
import type { cybersType } from "./cyber";

type Author = {
  id: number;
  nickname: string;
  email: string | null;
  username: string;
};

type ImageDetails = {
  id: number;
  md5: string;
  type: string;
  url: string;
  filename: string;
  size: number;
  key: string;
};
export type MetaCode = {
  blockly: string;
  lua?: string;
  js?: string;
};
export type Events = {
  inputs: any[];
  outputs: any[];
};
// 实体类型
export type metaInfo = {
  id: number;
  author_id: number;
  info: string | null;
  data: any | null;
  created_at?: string;
  image_id: number | null;
  uuid: string;
  events: Events | null;
  title: string;
  prefab: number;
  image: ImageDetails;
  resources: ResourceInfo[];
  editable: boolean;
  viewable: boolean;
  custome?: boolean;
  cyber: cybersType;
  author?: Author;
  verseMetas: any[];
  metaCode?: MetaCode | null;
};

export const postMeta = (data: Record<string, any>) => {
  return request<metaInfo>({
    url: `/v1/metas`,
    method: "post",
    data,
  });
};
export const putMetaCode = (id: string | number, data: MetaCode | null) => {
  return request<MetaCode>({
    url: `/v1/metas/${id}/code`,
    data,
    method: "put",
  });
};
export const getMeta = (id: string | number, params = {}) => {
  return request<metaInfo>({
    url: `/v1/metas/${id}${qs.stringify(params, true)}`,
    method: "get",
  });
};

export const getMetas = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
) => {
  const query: Record<string, any> = {};
  if (sort === "name") {
    sort = "title";
  } else if (sort === "-name") {
    sort = "-title";
  }
  query["expand"] = expand;
  query["sort"] = sort;

  if (search !== "") {
    query["MetaSearch[title]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }

  return request<metaInfo[]>({
    url: `/v1/metas${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const putMeta = (id: string | number, data: Record<string, any>) => {
  return request({
    url: `/v1/metas/${id}`,
    method: "put",
    data,
  });
};

export const deleteMeta = (id: string | number) => {
  return request({
    url: `/v1/metas/${id}`,
    method: "delete",
  });
};
