import request from "@/utils/request";
import qs from "querystringify";
import { metaInfo } from "./meta";

export const postMetaResource = (data: Record<string, any>) => {
  return request({
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
  const query: Record<string, any> = {
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
  return request<metaInfo[]>({
    url,
    method: "get",
  });
};

export const putMetaResource = (
  id: number | string,
  data: Record<string, any>
) => {
  const url = `/v1/meta-resources/${id}`;
  return request({
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
