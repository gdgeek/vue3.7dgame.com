import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import { ResourceInfo } from "../resources/model";
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
// 元数据类型
export type metaInfo = {
  id: number;
  author_id: number;
  info: string | null;
  data: string | null;
  created_at?: string;
  image_id: number | null;
  uuid: string;
  events: string | null;
  title: string;
  prefab: number;
  image: ImageDetails;
  resources: ResourceInfo[];
  editable: boolean;
  viewable: boolean;
  custome?: boolean;
  cyber?: cybersType;
  author?: Author;
  verseMetas: any[];
  metaCode?: MetaCode;
};

export const postMeta = (data: Record<string, any>) => {
  return request<metaInfo>({
    url: path.join("v1", "metas"),
    method: "post",
    data,
  });
};
export const putMetaCode = (id: number, data: MetaCode) => { 
  return request({
    url: path.join(
      "v1",
      "metas",
      `code${qs.stringify({ id: id }, true)}`
    ),
    data,
    method: "put",
  }); 
}
export const getMeta = (id: number, expand = "") => {
  return request<metaInfo>({
    url: path.join(
      "v1",
      "metas",
      `${id.toString()}${qs.stringify({ expand: expand }, true)}`
    ),
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
    url: path.join("v1", "metas") + qs.stringify(query, true),
    method: "get",
  });
};

export const putMeta = (id: number, data: Record<string, any>) => {
  return request({
    url: path.join("v1", "metas", id.toString()),
    method: "put",
    data,
  });
};

export const deleteMeta = (id: number) => {
  return request({
    url: path.join("v1", "metas", id.toString()),
    method: "delete",
  });
};
