import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";
import type { metaInfo } from "./meta";
import { ResourceInfo } from "@/api/v1/resources/model";
import { cybersType } from "./cyber";

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

// 实体类型
export type prefabsData = {
  id: number;
  author_id: number;
  info: object | null;
  data: string | null;
  // created_at?: string;
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
};

// export type prefabsData = metaInfo;
export const deletePrefab = (id: number) => {
  return request({
    url: path.join("v1", "prefabs", id.toString()),
    method: "delete",
  });
};
export const postPrefab = (data: Record<string, any>) => {
  return request({
    url: path.join("v1", "prefabs"),
    method: "post",
    data,
  });
};

export const getPrefab = (id: number, expand = "") => {
  return request<prefabsData>({
    url: path.join(
      "v1",
      "prefabs",
      id.toString() + qs.stringify({ expand: expand }, true)
    ),
    method: "get",
  });
};
export const getPrefabs = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
) => {
  const query: Record<string, any> = [];
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

  return request<prefabsData[]>({
    url: path.join("v1", "prefabs" + qs.stringify(query, true)),
    method: "get",
  });
};

export const putPrefab = (id: number, data: prefabsData) => {
  return request({
    url: path.join("v1", "prefabs", id.toString()),
    method: "put",
    data,
  });
};
