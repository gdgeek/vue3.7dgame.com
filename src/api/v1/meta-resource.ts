import request from "@/utils/request";
import qs from "querystringify";
import type { MetaInfo } from "./types/meta";
import type {
  MetaResourceItem,
  CreateMetaResourceRequest,
  UpdateMetaResourceRequest,
} from "./types/meta-resource";

export const postMetaResource = (data: CreateMetaResourceRequest) => {
  return request<MetaResourceItem>({
    url: `/v1/meta-resources`,
    method: "post",
    data,
  });
};

export const getMetaResources = (
  meta_id: string | number,
  type: string,
  sort = "-created_at",
  search = "",
  page = 0,
  expand = ""
) => {
  const query: Record<string, unknown> = {
    type,
    meta_id,
    sort,
    expand,
  };

  if (search !== "") {
    query["ResourceSearch[name]"] = search;
  }
  if (page > 1) {
    query["page"] = page;
  }

  const url = `/v1/meta-resources/resources${qs.stringify(query, true)}`;
  return request<MetaInfo[]>({
    url,
    method: "get",
  });
};

export const putMetaResource = (
  id: number | string,
  data: UpdateMetaResourceRequest
) => {
  const url = `/v1/meta-resources/${id}`;
  return request<MetaResourceItem>({
    url,
    method: "put",
    data,
  });
};

export const deleteMetaResource = (id: number | string) => {
  const url = `/v1/meta-resources/${id}`;
  return request({
    url,
    method: "delete",
  });
};
