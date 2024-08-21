import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const postVerseScript = (data: any) => {
  const url = path.join("v1", "verse-scripts");
  return request({
    url,
    method: "post",
    data: data,
  });
};
export const putVerseScript = (id: number, data: any) => {
  const url = path.join("v1", "verse-scripts", id.toString());
  return request({
    url,
    method: "put",
    data,
  });
};
export const getVerseScript = (id: number, expand = "") => {
  const query: Record<string, any> = [];

  query["expand"] = expand;
  const url = path.join(
    "v1",
    "verse-scripts",
    id.toString() + qs.stringify(query, true)
  );

  return request({
    url,
    method: "get",
  });
};
export const getVerseScripts = (verse_id: number, expand = "") => {
  const query: Record<string, any> = [];

  query["verse_id"] = verse_id;
  //query['sort'] = sort
  query["expand"] = expand;

  const url = path.join("v1", "verse-scripts" + qs.stringify(query, true));

  return request({
    url,
    method: "get",
  });
};

export const delVerseScripts = (id: number) => {
  const url = path.join("v1", "verse-scripts", id.toString());
  return request({
    url,
    method: "delete",
  });
};
