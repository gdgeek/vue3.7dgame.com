import request from "@/utils/request";
import qs from "querystringify";

type MultilanguageVerses = {
  verse_id?: number;
  language?: string;
  name: string;
  description?: string;
};

type putData = {
  name: string;
  description: string;
};

export const getlanguages = (id: number, expand = "languages") => {
  return request({
    url: `/v1/verses/${id}${qs.stringify({ expand: expand }, true)}`,
    method: "get",
  });
};

export const postlanguages = (data: MultilanguageVerses) => {
  return request({
    url: `/v1/multilanguage-verses`,
    method: "post",
    data,
  });
};

export const putlanguages = (id: number, data: putData) => {
  return request({
    url: `/v1/multilanguage-verses/${id}`,
    method: "put",
    data,
  });
};

export const dellanguages = (id: number) => {
  return request({
    url: `/v1/multilanguage-verses/${id}`,
    method: "delete",
  });
};
