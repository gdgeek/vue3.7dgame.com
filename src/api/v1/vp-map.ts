import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export function postVpMap(data: any) {
  return request({
    url: "v1/vp-maps",
    method: "post",
    data: data,
  });
}
export function deleteVpMap(id: number) {
  return request({
    url: "v1/vp-maps/" + id,
    method: "delete",
  });
}
export function getVpMaps(page = 1) {
  const query: Record<string, any> = [];
  if (page > 1) {
    query["page"] = page;
  }
  return request({
    url: path.join("v1", "vp-maps" + qs.stringify(query, true)),
    method: "get",
  });
}
