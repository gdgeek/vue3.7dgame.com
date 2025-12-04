import request from "@/utils/request";
import qs from "querystringify";

export const postVerseScript = (data: any) => {
  return request({
    url: `/verse-scripts`,
    method: "post",
    data: data,
  });
};
export const putVerseScript = (id: number, data: any) => {
  const url = `/verse-scripts/${id}`;
  return request({
    url,
    method: "put",
    data,
  });
};
export const getVerseScript = (id: number, expand = "") => {
  const query: Record<string, any> = [];

  query["expand"] = expand;
  const url = `/verse-scripts/${id}${qs.stringify(query, true)}`;

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

  const url = `/verse-scripts${qs.stringify(query, true)}`;

  return request({
    url,
    method: "get",
  });
};

export const delVerseScripts = (id: number) => {
  const url = `/verse-scripts/${id}`;
  return request({
    url,
    method: "delete",
  });
};
