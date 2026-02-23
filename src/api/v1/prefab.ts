import request from "@/utils/request";
import qs from "querystringify";
import type {
  PrefabData,
  CreatePrefabRequest,
  UpdatePrefabRequest,
} from "./types/prefab";

export type prefabsData = PrefabData;

// export type prefabsData = metaInfo;
export const deletePrefab = (id: number) => {
  return request({
    url: `/v1/prefabs/${id}`,
    method: "delete",
  });
};
export const postPrefab = (data: CreatePrefabRequest) => {
  return request({
    url: `/v1/prefabs`,
    method: "post",
    data,
  });
};

export const getPrefab = (id: number, expand = "") => {
  return request<PrefabData>({
    url: `/v1/prefabs/${id}${qs.stringify({ expand: expand }, true)}`,
    method: "get",
  });
};
export const getPrefabs = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author"
) => {
  const query: Record<string, unknown> = {};
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

  return request<PrefabData[]>({
    url: `/v1/prefabs${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const putPrefab = (id: number, data: UpdatePrefabRequest) => {
  return request({
    url: `/v1/prefabs/${id}`,
    method: "put",
    data,
  });
};
