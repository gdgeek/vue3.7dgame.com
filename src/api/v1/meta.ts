import request from "@/utils/request";
import qs from "querystringify";
import type {
  MetaInfo,
  MetaCode,
  CreateMetaRequest,
  UpdateMetaRequest,
} from "./types/meta";

export type metaInfo = MetaInfo;

export const postMeta = (data: CreateMetaRequest) => {
  return request<MetaInfo>({
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
export const getMeta = (
  id: string | number,
  params: Record<string, unknown> = {}
) => {
  return request<MetaInfo>({
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

  return request<MetaInfo[]>({
    url: `/v1/metas${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const putMeta = (id: string | number, data: UpdateMetaRequest) => {
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
