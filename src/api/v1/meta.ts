import { guardedWrite, type WriteOptions } from "./write-protocol";
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
export const putMetaCode = (
  id: string | number,
  data: MetaCode | null,
  write?: WriteOptions
) => {
  if (write)
    return guardedWrite<MetaCode>(
      `/v1/metas/${id}/code`,
      "put",
      data,
      { targetType: "meta", targetId: Number(id) },
      "save_code",
      write
    );
  return request<MetaCode>({
    url: `/v1/metas/${id}/code`,
    data,
    method: "put",
  });
};
export const getMeta = (
  id: string | number,
  params: Record<string, unknown> = {},
  signal?: AbortSignal
) => {
  return request<MetaInfo>({
    url: `/v1/metas/${id}${qs.stringify(params, true)}`,
    method: "get",
    signal,
  });
};

export const getMetas = (
  sort = "-created_at",
  search = "",
  page = 0,
  expand = "image,author",
  fields = "",
  perPage?: number
) => {
  const query: Record<string, unknown> = {};
  if (sort === "name") {
    sort = "title";
  } else if (sort === "-name") {
    sort = "-title";
  }
  query["expand"] = expand;
  query["sort"] = sort;
  if (fields !== "") {
    query["fields"] = fields;
  }

  if (search !== "") {
    query["MetaSearch[title]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }
  if (perPage && perPage > 0) {
    query["per-page"] = perPage;
  }

  return request<MetaInfo[]>({
    url: `/v1/metas${qs.stringify(query, true)}`,
    method: "get",
  });
};

export const putMeta = (
  id: string | number,
  data: UpdateMetaRequest,
  write?: WriteOptions
) => {
  if (write)
    return guardedWrite<MetaInfo>(
      `/v1/metas/${id}`,
      "put",
      data,
      { targetType: "meta", targetId: Number(id) },
      "save",
      write
    );
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
