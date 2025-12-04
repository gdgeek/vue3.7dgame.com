import request from "@/utils/request";
import qs from "querystringify";

export const postVpMap = (data: any) => {
  return request({
    url: `/vp-maps`,
    method: "post",
    data: data,
  });
};
export const deleteVpMap = (id: number) => {
  return request({
    url: `/vp-maps/${id}`,
    method: "delete",
  });
};
export const getVpMaps = (page = 1) => {
  const query: Record<string, any> = [];
  if (page > 1) {
    query["page"] = page;
  }
  return request({
    url: `/vp-maps${qs.stringify(query, true)}`,
    method: "get",
  });
};
